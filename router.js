const bodyParser = require("body-parser");
const express = require("express");
const mysql = require("mysql2");
const Joi = require("joi");

const type_meta = {
	designer: 0,
	artist: 1,
	researcher: 2,
	writer: 3,
	leader: 4,
	none: 5
};

const router = express.Router();
const {
	v4: uuidv4
} = require("uuid");

//connect to db
const connection = mysql.createConnection({
	host: process.env.HOST,
	database: process.env.DATABASE,
	password: process.env.PASSWORD,
	user: process.env.DB_USER,
	insecureAuth: true
});

connection.connect((err) => {
	if (err) throw err;
});

let week_meta;
async function weeks() {
	async function pullWeeks() {
		return new Promise((resolve, reject) => {
			connection.query("SELECT id, title, start_date, end_date, inClass_available, virtual_available FROM week", (err, row) => {
				if (err) reject(err);
				let pre_week = new Map();
				for (row_number in row) {
					pre_week.set(row[row_number].title, {
						id: row[row_number].id,
						inclass_available: row[row_number].inClass_available,
						virtual_available: row[row_number].virtual_available,
						start_date: row[row_number].start_date,
						end_date: row[row_number].end_date
					});
				}
				resolve(pre_week);
			});
		});
	}
	week_meta = await pullWeeks().catch((error) => {
		console.log(error);
	});
}
weeks();

router.use(bodyParser.urlencoded({
	extended: false
}));
router.use(bodyParser.json());

const basic_schema = Joi.object({
	first_name: Joi.string().min(1).max(255).required(),
	last_name: Joi.string().min(1).max(255).required(),
	email: Joi.string().email({
		minDomainSegments: 1,
		tlds: {
			allow: true
		}
	}).required(),
	updates: Joi.number().max(1)
});

//joi prospect schema
const camper_schema = Joi.object({
	dob: Joi.date().max("2015-01-01").required(),
	school: Joi.string().min(1).max(255).required(),
	grade: Joi.number().min(10).max(18).required(),
	gender: Joi.string().min(1).max(255).required(),
	type: Joi.string().min(5).max(255).lowercase().required(), //change for the type object
	race_ethnicity: Joi.string().required(),
	hopes_dreams: Joi.string().min(50).required(),
	tshirt_size: Joi.string().min(1).max(20).required(),
	borrow_laptop: Joi.number().max(1).required(),
	guardian_name: Joi.string().min(1).max(255).required(),
	guardian_email: Joi.string().email({
		minDomainSegments: 1,
		tlds: {
			allow: true
		}
	}).required(),
	guardian_phone: Joi.number().min(10).max(10).required(),
	participated: Joi.number().max(1).required(),
	weeks_coming: Joi.array().items(Joi.string().min(1).max(255).required())
}).concat(basic_schema);

router.get("/open-weeks", (req, res) => {
	let week_data = [];
	for (let [key, value] of week_meta) {
		let inner = {};
		inner.title = key;
		inner.inclass_available = value.inclass_available;
		inner.virtual_available = value.inclass_available;
		week_data.push(inner);
	};
	res.json(week_data);
});

const referral_schema = Joi.object({
	first_name: Joi.string().min(1).max(255).required(),
	last_name: Joi.string().min(1).max(255).required(),
	email: Joi.string().email({
		minDomainSegments: 1,
		tlds: {
			allow: true
		}
	}).required()
});

router.post("/camper-register-queueing", async (req, res) => {
	if (camper_schema.validate(req.body)) {
		let item = req.body;
		await prospectSignup(req.body);
		try {
			item.type = type_meta[item.type];
			// add them to the camper database, then enrollment based on their weeks
			connection.query("INSERT INTO camper (first_name, last_name, email, dob, school, grade, gender, type, race_ethnicity, " +
				"hopes_dreams, tshirt_size, borrow_laptop, guardian_name, guardian_email, guardian_phone, participated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [item.first_name, item.last_name, item.email, item.dob, item.school, item.grade, item.gender, item.type, item.race_ethncity,
					item.hopes_dreams, item.tshirt_size, item.borrow_laptop, item.guardian_name, item.guardian_email, item.participated
				], async (err, camper_id) => {
					if (err) console.log(err);
					connection.query("SELECT id FROM camper WHERE first_name=? AND last_name=? AND email=?", [item.first_name, item.last_name, item.email], async (err, camper_id) => {
						if (err) console.log(err);
						//insert for each week they signed up for
						let weeks = [],
							count = 0;
						for (week in item.weeks_coming) {
							if (week_meta.has(item.weeks_coming[week]) && item.weeks_coming[week] != 0) {
								//make a new list of which weeks they're in, then add to enrollment based on that
								weeks[count] = item.weeks_coming[week];
								count++;
							}
						}
						async function enrollmentInsert(week) {
							return new Promise((resolve, reject) => {
								connection.query("INSERT INTO enrollment (camper_id, week_id, signup_time, enrollment_code, person_loc, approved) VALUES " +
									"(?, ?, ?, ?, ?, ?)", [camper_id[0].id, week_meta.get(weeks[week]).id, new Date(), uuidv4(), parseInt(item.weeks_coming[week], 10) - 1, 0], (err) => {
										if (err) reject(err);
										connection.query("SELECT id, question_text FROM question_meta WHERE week_id=?", week_meta.get(weeks[week]).id, (err, questions) => {
											if (err) reject(err);
											if (questions.length) resolve(questions);
											resolve([]);
										});
									});
							});
						}
						let questions = {};
						if (weeks.length) {
							for (let weeks_db = 0; weeks_db < weeks.length; weeks_db++) {
								let any_questions = await enrollmentInsert(weeks_db);
								try {
									//each week sends back questions for the specific person - need to build up an array
									for (let question = 0; question < any_questions.length; question++) {
										questions[question] = {
											question_text: any_questions[question].question_text,
											id: any_questions[question].id
										}
									}
									if (week_db == weeks.length - 1) {
										res.json(questions);
									}
								} catch (error) {
									console.log(error);
								}
							}
						}
						if (req.body.prospect && re) {}
					});
				});
		} catch (error) {
			console.log(error);
		}
	} else {
		console.log(camper_schema.validate(req.body).error);
	}
});

router.post("/signup-prospect", async (req, res) => {
	if (pros_schema.validate(req.body)) {
		await prospectSignup(req.body);
		try {
			res.end();
		} catch (error) {
			console.log(error);
		}
	} else {
		console.log(pros_schema.validate(user_data).error);
	}
});

// this will work for all the needed inserts into prospect, just change subscribed
async function prospectSignup(user_data) {
	return new Promise((resolve, reject) => {
		let unique_retrieval = uuidv4();
		connection.query("INSERT INTO prospect (first_name, last_name, email, unique_retrieval, subscribed) VALUES (?, ?, ?, ?, ?)", [user_data.first_name, user_data.last_name, user_data.email, unique_retrieval, user_data.updates], (err) => {
			if (err) reject(err); //chat with bre about error handle
			resolve(false);
		});
	});
}

function quicksort(array, low, high) {
	if (low < high) {
		let pivot = partition(array, low, high);
		array = pivot[1];
		array = quicksort(array, low, pivot[0] - 1);
		array = quicksort(array, pivot[0] + 1, high);
	}
	return array;
}

function partition(array, low, high) {
	let pivot = low;
	let i = high + 1;
	for (let j = high; j > low; j--) {
		if (array[j][0] > array[pivot][0] && i != j) {
			i--;
			let week_buffer = array[i][0];
			let camper_buffer = array[i][1];
			array[i][0] = array[j][0];
			array[i][1] = array[j][1];
			array[j][0] = week_buffer;
			array[j][1] = camper_buffer;
		}
	}
	if (i >= 0) {
		let week_buffer = array[i - 1][0];
		let camper_buffer = array[i - 1][1];
		array[i - 1][0] = array[pivot][0];
		array[i - 1][1] = array[pivot][1];
		array[pivot][0] = week_buffer;
		array[pivot][1] = camper_buffer;
	}
	return [i - 1, array];
}

router.post("/pull-current-campers", async (req, res) => {
	connection.query("SELECT value_str FROM system_settings WHERE name='admin_code'", async (err, code) => {
		if (err) console.log(err);
		if (req.body.code == code[0].value_str) {
			//throw all currently pending campers - run through and see which ones are still waiting in enrollment
			connection.query("SELECT camper_id, week_id FROM enrollment WHERE approved=?", req.body['applicants-or-registered'], async (err, camper_ids) => {
				if (err) console.log(err);
				let obj = {
					campers: []
				};
				let id = [];
				let camper_pos = [];
				for (ids in camper_ids) {
					camper_pos[ids] = [];
					camper_pos[ids][0] = camper_ids[ids].week_id
					camper_pos[ids][1] = camper_ids[ids].camper_id;
				}
				camper_pos = quicksort(camper_pos, 0, camper_pos.length - 1);

				function allCampers() {
					return new Promise((resolve, reject) => {
						//build up the week object
						let inner = {};
						connection.query("SELECT title FROM week WHERE id=?", id[1], (err, week_title) => {
							if (err) reject(err);
							inner.week = week_title[0].title;
							connection.query("SELECT id, first_name, last_name, type, hopes_dreams, participated FROM camper WHERE id=?", id, (err, camper) => {
								if (err) reject(err);
								inner.camper_id = camper[0].id;
								inner.first_name = camper[0].first_name;
								inner.last_name = camper[0].last_name;
								inner.type = camper[0].type;
								inner.hopes_dreams = camper[0].hopes_dreams;
								inner.participated = camper[0].participated == 1 ? "Participated before" : "Has not participated";
								resolve(inner);
							});
						});
					});
				}
				let each_week_rolling = [];
				for (let each_id = 0; each_id < camper_ids.length; each_id++) {
					id[0] = camper_pos[each_id][1];
					id[1] = camper_pos[each_id][0];
					obj.campers.push(await allCampers());
					try {
						if (each_id == camper_ids.length - 1) {
							res.json(obj);
						}
					} catch (error) {
						console.log(error);
					}
				}
			});
		} else {
			res.sendStatus(404);
		}
	});
});

const application_schema = Joi.object({
	code: Joi.string().length(36).required(),
	camper_id: Joi.number().required(),
	week_name: Joi.string().required()
});

router.post("/accept-camper-application", (req, res) => {
	if (application_schema.validate(req.body)) {
		connection.query("SELECT value_str FROM system_settings WHERE name='admin_code'", async (err, code) => {
			if (err) console.log(err);
			if (req.body.code == code[0].value_str) {
				connection.query("SELECT id FROM week WHERE title=?", req.body.week_name, (err, week_id) => {
					if (err) console.log(err);
					connection.query("UPDATE enrollment SET approved=1 WHERE camper_id=? AND week_id=?", [req.body.camper_id, week_id[0].id], (err) => {
						if (err) console.log(err);
						res.end();
					});
				});
			}
		});
	} else {
		res.render("error", {
			title: "Uh oh"
		});
	}
});

module.exports = router;
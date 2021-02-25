const labels = "text-lg font-semibold";
const inputs = "text-xl bg-transparent mt-1 border-4 border-solid border-gray-200 outline-none focus:border-yellow transition duration-200 px-6 md:px-8 py-4 mb-8 appearance-none w-full";
const notes = "text-base text-gray-500 italic";
const spans = "text-red-500 inline-block";
const submitStyle = "block text-center py-4 w-full bg-yellow font-semibold hover:bg-yellow-dark transition duration-200 md:text-xl cursor-pointer";
const form = "md:w-100 md:mx-auto";

let application = new Smartform("/camper-register-queueing", "POST");

let weekIds = [];

let firstName = new Field("input:text", "first_name")
    .require()
    .setLabel("Camper's First Name")
    .placeholder("ex. John");
let lastName = new Field("input:text", "last_name")
    .require()
    .setLabel("Camper's Last Name")
    .placeholder("ex. Smith");
let email = new Field("input:email", "email")
    .require()
    .setLabel("Camper's Email Address")
    .placeholder("ex. john@smith.com");
let dob = new Field("input:date", "dob")
    .require()
    .setLabel("Camper's Date of Birth")
    .placeholder("01/01/2002");
let schoolList = new Field("datalist", "school")
    .removeName()
    .addOptions([
        "Albemarle High School",
        "Blue Ridge Governor's School",
        "Charlottesville High School",
        "Fluvanna High School",
        "Goochland High School",
        "Louisa High School",
        "Madison High School",
        "Miller High School",
        "Monticello High School",
        "Murray High School",
        "Nelson High School",
        "Orange High School",
        "St. Anne's-Belfield",
        "The Covenant High School",
        "Western Albemarle High School",
        "William Monroe High School",
        "Homeschooled"
    ]);
let school = new Field("input:text", "school")
    .require()
    .setLabel("Current High School")
    .addNote("Note: if your school does not appear, you can type it in.")
    .removeType()
    .placeholder("Click to start typing")
    .list("school");
let grade = new Field("select", "grade")
    .require()
    .setLabel("Grade for 2021-2022 Year")
    .addOptions([
        [5, "I will be in 5th grade"],
        [6, "I will be in 6th grade"],
        [7, "I will be in 7th grade"],
        [8, "I will be in 8th grade"],
        [9, "I will be in 9th grade"],
        [10, "I will be in 10th grade"],
        [11, "I will be in 11th grade"]
    ]);
let genderList = new Field("datalist", "gender")
    .removeName()
    .addOptions([
        "Male",
        "Female",
        "Decline to state"
    ]);
let gender = new Field("input:text", "gender")
    .require()
    .setLabel("Gender")
    .addNote("Note: if your gender identity does not appear, you can type it in.")
    .removeType()
    .placeholder("Click to start typing")
    .list("gender");
let type = new Field("select", "type")
    .require()
    .setLabel("Which bests describe you?")
    .addOptions([
        ["designer", "I am a designer"],
        ["artist", "I am a artist"],
        ["researcher", "I am a researcher"],
        ["writer", "I am a writer"],
        ["engineer", "I am a engineer"],
        ["leader", "I am a leader"],
        ["none", "None of these things describe me"]
    ]);
let race = new Field("select", "race_ethnicity")
    .require()
    .setLabel("Race/Ethnicity")
    .addOptions([
        "Asian/Pacific Islander",
        "Black/African American",
        "Hispanic/Latino",
        "Native American/American Indian",
        "White/Caucasian",
        "Decline to State"
    ]);
let hopes = new Field("textarea", "hopes")
    .require()
    .setLabel("Why are you interesting in participating in SPARK? What do you hope to gain from this experience?")
    .placeholder("Your answer");
let tShirtSize = new Field("select", "tshirt_size")
    .require()
    .setLabel("T-Shirt Size")
    .addOptions([
        "Small",
        "Medium",
        "Large",
        "X-Large"
    ]);
let laptop = new Field("select", "borrow_laptop")
    .setLabel("If you’re coming in-person, do you have your own laptop that you could bring?")
    .addOptions([
        [0, "Yes, I will come with my own laptop"],
        [1, "No, I want help finding one"]
    ]);
let parentName = new Field("input:text", "guardian_name")
    .require()
    .setLabel("Parent/Guardian Full Name")
    .placeholder("ex. Jane Smith");
let parentEmail = new Field("input:email", "guardian_email")
    .require()
    .setLabel("Parent/Guardian Email Address")
    .placeholder("ex. jane@smith.com");
let parentNumber = new Field("input:tel", "guardian_number")
    .require()
    .setLabel("Parent/Guardian Phone Number")
    .pattern("[0-9]{10}")
    .placeholder("ex. 1112223333");
let participationStatus = new Field("select", "participated")
    .require()
    .setLabel("Have you participated in a Spark event before?")
    .addOptions([
        [1, "Hackathon 2017"],
        [1, "Hackathon 2018"],
        [1, "Hackathon 2019"],
        [1, "Hackathon 2020"],
        [1, "Summer Spark 2017"],
        [1, "Summer Spark 2018"],
        [1, "Summer Spark 2019"],
        [1, "Summer Spark 2020"],
        [0, "No, this is my first Spark event!"]
    ]);
let referName = new Field("input:text", "refer_name")
    .setLabel("If you'd like, you can refer a friend! They'll get an email asking if they would like to sign up.")
    .placeholder("ex. Dakota Jones");
let referEmail = new Field("input:email", "refer_email")
    .setLabel("Friend's Email Address")
    .placeholder("ex. dakota@jones.com");
let submit = new Field("input:submit", "")
    .value("Continue Application →")
    .class(submitStyle);

application
    .styles(labels, notes, spans, inputs)
    .formStyles(form)
    .addFields([
        firstName,
        lastName,
        email
    ]);

fetch("/open-weeks")
    .then(results => results.json())
    .then(weeks => {
        let select = new Field("select", "weeks_coming")
            .require()
            .setLabel("For which weeks are your registering?")
            .multiple()
            .addNote("Note: you can select multiple")
            .size((weeks.length*3) + weeks.length)
            
        for(let week of weeks) {
            let { title, id, inclass_available: in_person, virtual_available: virtual } = week;
            weekIds.push(id);
            
            let group = $(`<optgroup label="${title} – Choose one"></optgroup>`);

            group.append(`<option value="${id}-0">I am not attending this week</option>`);

            if(virtual) {
                group.append(`<option value="${id}-1">I will come virtually</option>`);
            }

            if(in_person) {
                group.append(`<option value="${id}-2">I will come in person</option>`);
            }

            select.field.append(group);
        }

        application.addFields([ select ]);
    })
    .then(() => {
        application
            .addFields([
                dob,
                schoolList,
                school,
                grade,
                genderList,
                gender,
                type,
                race,
                hopes,
                tShirtSize,
                laptop,
                parentName,
                parentEmail,
                parentNumber,
                participationStatus,
                referName,
                referEmail,
                submit
            ])
            .mountTo("#camper_application");
    })
    .then(() => {
        $("#weeks_coming option").mousedown(e => {
            e.preventDefault();
            $(e.target).attr("selected", !$(e.target).attr("selected"));
            return false;
        });
    })
    .catch(err => console.error(err));
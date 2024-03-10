import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import axios from "axios";
import session from "express-session";
import passport from "passport";
import env from "dotenv";
import bcrypt from "bcrypt";
import { Strategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2";

const app = express();
const port = 3000;
const saltRounds = 10;
app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
env.config();
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: true,
        cookie:{
            maxAge: 1000*60*60,
        }
    })
)
app.use(passport.initialize());
app.use(passport.session());
//connect to pgAdmin4
const db = new pg.Client({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
})
db.connect();

// fetch book image from PUBLIC API
async function bookImg(isbn) {
    // Construct the URL for the image based on the ISBN
    const imgUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`;
    return imgUrl;
}


app.get("/", async(req, res) => {
    const result = await db.query("SELECT * FROM book INNER JOIN author ON book.author_id = author.id INNER JOIN note ON book.note_id = note.id;");
    const books = result.rows;
    books.forEach(book =>{
        if (book.read_date) {
            const [year, month, day] = book.read_date.toISOString().split('T')[0].split('-');
            book.read_date = `${month}/${day}/${year}`;
        }
    })
    res.render("index.ejs", { 
        books: books,
        isAuthenticated: req.isAuthenticated()
    });
});

//read-more
app.post("/read-more", async(req, res)=> {
    const id = req.body.bookId;
    console.log(id);
    try {
        const result = await db.query("SELECT content FROM note WHERE id=$1;",[id]);
        const note = result.rows[0].content;    
        res.render("read.ejs", {note, isAuthenticated: req.isAuthenticated()})
    } catch (error) {
        console.log(error);
    }
})
//login GET
app.get("/login", (req, res) => {
    if (req.isAuthenticated()) {
        res.redirect("/edit");
    } else {
        res.render("login.ejs");
    }
    
})

//login POST
app.post("/login",
        passport.authenticate("local", {
            successRedirect: "/",
            failureRedirect: "/login",
        })
);

// Sign in with google
app.get("/auth/google",
    passport.authenticate('google',{scope:
        ['email', 'profile']
        }
    )
);

app.get("/auth/google/callback",
        passport.authenticate('google', {
            successRedirect: "/",
            failureRedirect: "/login",
        })
)


// log out
app.post("/logout", (req, res)=> {
    req.logout(function (err) {
        if (err) {
            return next(err);
        }
        res.redirect("/");
    })
})
//register GET
app.get("/register", (req, res) => {
    res.render("register.ejs");
})

//register POST
app.post("/register", async(req, res)=> {
    const email = req.body.email;
    const password = req.body.password;
    try {
        const result = await db.query("SELECT * FROM users WHERE email=$1", [email]);
        if (result.rows.length > 0) {
            console.log("User already exists.");
        } else {
            bcrypt.hash(password, saltRounds, async(err, hash)=> {
                if (err) {
                    console.log("Error hashing password: " + err);
                } else {
                    const insertResult = await db.query("INSERT INTO users(email, password) VALUES($1, $2) RETURNING *",[email, hash]);
                    const user = insertResult.rows[0];
                    req.login(user, (err)=>{
                        console.log(err);
                        res.redirect("/edit");
                    })
                }
            })
        }
    } catch (error) {
        console.log(error);
    }
})
    
//GET edit.ejs
app.get("/edit", (req, res) => {
    if (req.isAuthenticated()) {
        res.render("edit.ejs", {
            isAuthenticated: req.isAuthenticated(),
        });
    } else {
        res.redirect("/login");
    }
}
)
    
// sorting
app.post("/sort", async(req, res) => {
    
    const action = req.body.criteria;
    console.log(action);
    if (action === 'title') {
        const result = await db.query("SELECT * FROM book INNER JOIN author ON book.author_id = author.id INNER JOIN note ON book.note_id = note.id ORDER BY title ASC;");
        const books = result.rows;
        books.forEach(book =>{
            if (book.read_date) {
                const [year, month, day] = book.read_date.toISOString().split('T')[0].split('-');
                 book.read_date = `${month}/${day}/${year}`;
        }
        })
        res.render("index.ejs", { books: books,
            isAuthenticated: req.isAuthenticated(),
        });
    }
    else if (action === 'newest') {
        const result = await db.query("SELECT * FROM book INNER JOIN author ON book.author_id = author.id INNER JOIN note ON book.note_id = note.id ORDER BY read_date DESC;");
        const books = result.rows;
        books.forEach(book =>{
            if (book.read_date) {
                const [year, month, day] = book.read_date.toISOString().split('T')[0].split('-');
                 book.read_date = `${month}/${day}/${year}`;
            }
            })
            res.render("index.ejs", { books: books,
                isAuthenticated: req.isAuthenticated(),
            });
    }
    else if (action === 'best') {
        const result = await db.query("SELECT * FROM book INNER JOIN author ON book.author_id = author.id INNER JOIN note ON book.note_id = note.id ORDER BY my_rating DESC;");
        const books = result.rows;
        books.forEach(book =>{
            if (book.read_date) {
                const [year, month, day] = book.read_date.toISOString().split('T')[0].split('-');
                 book.read_date = `${month}/${day}/${year}`;
            }
            })
            res.render("index.ejs", { books: books,
                isAuthenticated: req.isAuthenticated(),
            });
    }
})


app.post("/new", async(req, res)=> {

    res.render("edit.ejs");
})

//add new post 
app.post("/add", async(req, res)=> {
    // retrive data from edit.ejs
    const first_name = req.body.first_name ? req.body.first_name.trim() : '';
    const last_name = req.body.last_name ? req.body.last_name.trim() : '';
    const title = req.body.title ? req.body.title.trim() : '';
    const isbn = req.body.isbn;
    const brief = req.body.brief;
    const content = req.body.content;
    const read_date = req.body.read_date;
    const my_rating = req.body.my_rating;
    // get img_url
    const img_url = await bookImg(isbn);
    console.log(first_name);
    console.log(last_name);
    console.log(title);
    console.log(isbn);
    console.log(brief);
    console.log(content);
    console.log(read_date);
    console.log(my_rating);
    console.log(img_url);
    //inputting data to db
    try {
        // insert into author table returning id
        const authorResult = await db.query("INSERT INTO author(first_name, last_name) VALUES($1,$2) RETURNING id;",[first_name, last_name]);
        // obtain author_id
        const author_id = authorResult.rows[0].id;
        // insert into note table returning id
        const noteResult = await db.query("INSERT INTO note(content, read_date, my_rating, brief) VALUES($1,$2,$3,$4) RETURNING id;",[content,read_date,my_rating,brief]);
        // obtain note_id
        const note_id = noteResult.rows[0].id;
        // insert into book table
        db.query("INSERT INTO book(title, isbn, purchasing_link, note_id, author_id, img_url) VALUES($1,$2,$3,$4,$5,$6);",[title,isbn,'amazon.com',note_id,author_id,img_url]);
        console.log("Info added succesfully!")
        res.redirect("/");
    } catch (error) {
        console.log(error);
    }
})

passport.use(
    "local",
    new Strategy({
        usernameField: 'email',
        passwordField: 'password'
    },async function verify(username, password, cb) {
        try {
            const result = await db.query("SELECT * FROM users WHERE email = $1", [username]);
            if (result.rows.length > 0) {
                const user = result.rows[0];
                const storedPassword = result.rows[0].password;
                
                bcrypt.compare(password, storedPassword, (err, valid) =>{
                    if (err) {
                        console.log("Error comparing: " + err);
                        return cb(err);
                    } else {
                        if (valid) {
                            console.log("Login success");
                            return cb(null, user);
                        } else {
                            console.log("password incorrect");
                            return cb(null, false);
                        }
                    }
                })
            } else {
                return cb(null, false);
            }
        } catch (error) {
            return cb(error);
        }
}))

// GoogleStrategy
passport.use(
    "google",
    new GoogleStrategy(
        {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/callback",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
  },
  async (accessToken, refreshToken, profile, cb) => {
    console.log(profile);
    const result = await db.query("SELECT * FROM users WHERE email=$1",[profile.email]);
    if (result.rows.length === 0) {
        const newUser = await db.query(
            "INSERT INTO users(email, password) VALUES ($1, $2)", [profile.email, "google"]
        );
        return cb(null, newUser.rows[0]);
    } else {
        return cb(null, result.rows[0]);
    }
  }
));

passport.serializeUser((user, cb)=>{
    cb(null, user);
})
passport.deserializeUser((user, cb)=>{
    cb(null, user);
})
// listen
app.listen(port, (req, res)=> {
    console.log(`Server on port ${port}`);
})
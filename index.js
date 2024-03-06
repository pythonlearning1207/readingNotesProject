import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import axios from "axios";

const app = express();
const port = 3000;
app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
//connect to pgAdmin4
const db = new pg.Client({
    user:'postgres',
    host:'localhost',
    database:'books',
    password:'Jia3202128',
    port:5432,
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
    res.render("index.ejs", { books: books });
});

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
// listen
app.listen(port, (req, res)=> {
    console.log(`Server on port ${port}`);
})
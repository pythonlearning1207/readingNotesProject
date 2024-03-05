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
function bookImg(isbn) {
    // Construct the URL for the image based on the ISBN
    const imgUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`;
    return imgUrl;
}


app.get("/", async(req, res) => {
    const result = await db.query("SELECT * FROM book INNER JOIN author ON book.author_id = author.id INNER JOIN note ON book.note_id = note.id;");
    const data = result.rows;
    res.render("index.ejs", { books: data });
});


// listen
app.listen(port, (req, res)=> {
    console.log(`Server on port ${port}`);
})
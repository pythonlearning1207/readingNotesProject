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
    const data = result.rows;
    res.render("index.ejs", { books: data });
});

app.post("/new", async(req, res)=> {

    res.render("edit.ejs");
})

//add new post 
app.post("/add", async(req, res)=> {
    // retrive data from edit.ejs
    const first_name = req.body.first_name;
    const last_name = req.body.last_name;
    const title = req.body.title;
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

})
// listen
app.listen(port, (req, res)=> {
    console.log(`Server on port ${port}`);
})
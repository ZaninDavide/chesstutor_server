const express = require("express")
const cors = require("cors")
const bodyParser = require("body-parser")
const zxcvbn = require("zxcvbn")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const db = require("./database")
const { ObjectID } = require("mongodb")
require("dotenv").config()

async function main() {
    const app = express()
    app.use(cors())
    app.use(bodyParser.json())

    const { User } = await db

    const PORT = process.env.PORT || 5000
    const SALT_ROUNDS = 10
    const SECRET = process.env.SECRET

    app.get("/", (req, res) => res.send("ChessUp server active!"))

    app.post("/signup", async (req, res) => {
        if (!req.body.email || !req.body.password) {
            res.status(400).send(
                "You need to specify email and password in the body"
            )
            return
        }
        const passwordCheck = zxcvbn(req.body.password, [req.body.email])
        if (passwordCheck.score <= 2) {
            res.status(400).send(
                "Weak password - " +
                    passwordCheck.feedback.suggestions.join(", ")
            )
            return
        }

        const otherUserFound = await User.findOne({ email: req.body.email })
        if (otherUserFound) {
            res.status(400).send(
                "Another user with the same email already exists"
            )
            return
        }

        const { insertedId } = await User.insertOne({
            email: req.body.email,
            password: await bcrypt.hash(req.body.password, SALT_ROUNDS),
        })

        const token = jwt.sign(
            {
                iat: +new Date(),
                tokenType: "LOGIN",
                userId: insertedId,
            },
            SECRET
        )

        res.send(token)
    })

    app.post("/login", async (req, res) => {
        if (!req.body.email || !req.body.password) {
            res.status(400).send(
                "You need to specify email and password in the body"
            )
            return
        }

        const userFound = await User.findOne({ email: req.body.email })

        if (userFound === null) {
            res.status(400).send("Wrong email")
            return
        } else if (
            !(await bcrypt.compare(req.body.password, userFound.password))
        ) {
            res.status(400).send("Wrong password")
            return
        }

        const token = jwt.sign(
            {
                iat: +new Date(),
                tokenType: "LOGIN",
                userId: userFound._id,
            },
            SECRET
        )

        res.send(token)
    })

    function checkAuthorization(req, res, next) {
        const header = req.headers["authorization"]

        if (!header || !header.startsWith("Bearer ")) {
            res.status(400).send("Set the authoriation token in the header")
            return
        }

        const token = header.substring("Bearer ".length)

        try {
            const decoded = jwt.verify(token, SECRET)
            req.auth = decoded
            next()
        } catch (e) {
            res.status(400).send("Invalid token")
            return
        }
    }

    app.get("/user", checkAuthorization, async (req, res) => {
        const userFound = await User.findOne({ _id: ObjectID(req.auth.userId) })
        res.send(
            JSON.stringify({
                ...userFound,
                password: undefined,
            })
        )
    })

    app.post("/user", checkAuthorization, async (req, res) => {
        await User.updateOne(
            { _id: ObjectID(req.auth.userId) },
            { $set: req.body }
        )
        res.send("Ok")
    })

    // ADD OPENING

    app.post("/addOpening", checkAuthorization, async (req, res) => {
        // req.body is the opening json object
        await User.updateOne(
            { _id: ObjectID(req.auth.userId) },
            { $push: {user_ops: req.body} }
        )
        res.send("Ok")
    })

    // DELETE OPENING

    app.post("/deleteOpening/:op_index", checkAuthorization, async (req, res) => {
        let op_index = req.params.op_index
         // make the opening element become null
        let op_search = "user_ops." + op_index.toString()
        await User.updateOne(
            { _id: ObjectID(req.auth.userId) },
            { $unset: {[op_search]: 1} }
        )
        // remove all null objects in the user_ops array
        await User.updateOne(
            { _id: ObjectID(req.auth.userId) },
            { $pull: {user_ops: null}}
        )
        res.send("Ok")
    })

    // RENAME OPENING

    app.post("/renameOpening/:op_index", checkAuthorization, async (req, res) => {
        let op_index = req.params.op_index
        let name_search = "user_ops." + op_index.toString() + ".op_name"
        await User.updateOne(
            { _id: ObjectID(req.auth.userId) },
            { $set: {[name_search]: req.body.new_name} }
        )
        res.send("Ok")
    })

    // SET OPENING ARCHIVED (or not archived)

    app.post("/setOpeningArchived/:op_index", checkAuthorization, async (req, res) => {
        let op_index = req.params.op_index
        let archived_search = "user_ops." + op_index.toString() + ".archived"
        await User.updateOne(
            { _id: ObjectID(req.auth.userId) },
            { $set: {[archived_search]: req.body.archived} }
        )
        res.send("Ok")
    })

    // ADD VARIATION

    app.post("/addVariation/:op_index", checkAuthorization, async (req, res) => {
        let op_index = req.params.op_index
        let archived_search = "user_ops." + op_index.toString() + ".variations"
        await User.updateOne(
            { _id: ObjectID(req.auth.userId) },
            { $push: {[archived_search]: req.body} }
        )
        res.send("Ok")
    })

    // SET VARIATION ARCHIVED (or not archived)

    app.post("/setVariationArchived/:op_index/:vari_index", checkAuthorization, async (req, res) => {
        let op_index = req.params.op_index
        let vari_index = req.params.vari_index
        let archived_search = "user_ops." + op_index.toString() + ".variations." + vari_index + ".archived"
        await User.updateOne(
            { _id: ObjectID(req.auth.userId) },
            { $set: {[archived_search]: req.body.archived} }
        )
        res.send("Ok")
    })

    // RENAME VARIATION

    app.post("/renameVariation/:op_index/:vari_index", checkAuthorization, async (req, res) => {
        let op_index = req.params.op_index
        let vari_index = req.params.vari_index
        let name_search = "user_ops." + op_index.toString() + ".variations." + vari_index + ".vari_name"
        await User.updateOne(
            { _id: ObjectID(req.auth.userId) },
            { $set: {[name_search]: req.body.new_name} }
        )
        res.send("Ok")
    })

    // DELETE VARIATION

    app.post("/deletevariation/:op_index/:vari_index", checkAuthorization, async (req, res) => {
        let op_index = req.params.op_index
        let vari_index = req.params.vari_index
         // make the variation element become null
        let vari_search = "user_ops." + op_index.toString() + ".variations." + vari_index
        await User.updateOne(
            { _id: ObjectID(req.auth.userId) },
            { $unset: {[vari_search]: 1} }
        )
        // remove all null objects in the variations array
        let variations_search = "user_ops." + op_index.toString() + ".variations"
        await User.updateOne(
            { _id: ObjectID(req.auth.userId) },
            { $pull: {[variations_search]: null}}
        )
        res.send("Ok")
    })

    // EDIT COMMENT

    app.post("/editComment/:op_index/:comment_name", checkAuthorization, async (req, res) => {
        let op_index = req.params.op_index
        let comment_name = req.params.comment_name
        let comment_search = "user_ops." + op_index.toString() + ".comments." + comment_name.toString()
        await User.updateOne(
            { _id: ObjectID(req.auth.userId) },
            { $set: {[comment_search]: req.body.text} }
        )
        res.send("Ok")
    })

    // UPDATE DRAW BOARD ON PDF

    app.post("/setDrawBoardPDF/:op_index/:move_name", checkAuthorization, async (req, res) => {
        let op_index = req.params.op_index
        let move_name = req.params.move_name
        let moveDraw_search = "user_ops." + op_index.toString() + ".pdfBoards." + move_name.toString()
        await User.updateOne(
            { _id: ObjectID(req.auth.userId) },
            { $set: {[moveDraw_search]: req.body.value} }
        )
        res.send("Ok")
    })

    // LISTEN TO PORT

    app.listen(PORT, () =>
        console.log(`ChessUp server listening on port ${PORT}!`)
    )
}

main()

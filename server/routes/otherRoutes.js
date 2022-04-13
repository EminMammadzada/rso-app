const router = require('express').Router();
const AppError = require('../utils/AppError');
const connection = require('../db')
const { verifyToken, isSuperAdmin, isAdmin } = require('../middleware');
const { v4: uuidv4 } = require('uuid');


router.post('/university', verifyToken, isSuperAdmin, (req, res) => {
    const { numStudents = 0, website = 'https://www.google.com', name = 'N/A', description = 'N/A', address = 'N/A' } = req.body
    const uni_id = uuidv4()

    connection.query(
        `INSERT INTO universities (uni_id,students,website,name,description,address) VALUES ("${uni_id}", "${numStudents}", "${website}", "${name}", "${description}", "${address}")`
        , (err, response) => {
            if (err) {
                res.status(500).json({ err: err })
            } else {
                res.status(200).json({ response: response, err: '' })
            }
        })

    connection.query(`INSERT INTO creates (user_id, uni_id) VALUES ("${req.user.user_id}", "${uni_id}")`)
})


router.get('/university', verifyToken, (req, res) => {
    connection.query('SELECT * FROM universities', (err, result) => {
        if (err) {
            res.status(500).json({ err: `oh no something happened, ${err}` })
        } else {
            res.status(200).json(result)
        }
    });
});

router.post('/university/:university_id', verifyToken, (req, res) => {
    const { university_id } = req.params
    connection.query(`SELECT * FROM attends WHERE user_id = "${req.user.user_id}"`, (err, response) => {
        if (err) {
            res.status(500).json({ err: `oh no something happened, ${err}` })
        } else {
            if (response.length > 0) {
                res.status(500).json({ err: "you are already attending a university" })
            }
            else {
                connection.query(`INSERT INTO attends (user_id, uni_id) VALUES ("${req.user.user_id}", "${university_id}")`, (err2, result) => {
                    if (err2) {
                        res.status(500).json({ err: `oh no something happened, ${err2}` })
                    } else {
                        res.status(200).json(result)
                    }
                })
            }
        }
    }
    )
})


router.post('/rso', verifyToken, isAdmin, (req, res) => {
    const { name, email } = req.body
    connection.query(
        `INSERT INTO rsos (user_id, rso_id, name, email) VALUES ( "${req.user.user_id}", "${uuidv4()}", "${name}", "${email}")`
        , (err, response) => {
            if (err) {
                return res.status(500).json({ err: err })
            } else {
                return res.status(200).json({ response: response, err: '' })
            }
        })
})

router.get('/rso', verifyToken, (req, res) => {
    connection.query(`SELECT R.* FROM rsos R, attends A, admins AD WHERE A.user_id = "${req.user.user_id}" AND A.uni_id = AD.uni_id AND AD.user_id = R.user_id`, (err, response) => {
        if (err) {
            return res.status(500).json({ err: err })
        } else {
            return res.status(200).json({ response: response, err: '' })
        }
    })
})

//needs fixing, have to check if user attends the university the RSO belongs to
router.post('/rso/:rso_id', verifyToken, (req, res) => {
    const { rso_id } = req.params

    connection.query(`SELECT * FROM rsos WHERE rso_id="${rso_id}"`, (err, response) => {
        if (err) {
            return res.status(500).json({ err: err })
        } else {

            //check if admin tries to join an RSO
            if (req.user.user_id == response[0].user_id) {
                return res.status(500).json({ err: 'Cannot join RSO that you are admin of' })
            }

            //check if user is already in that RSO
            connection.query(`SELECT * FROM joins WHERE rso_id="${rso_id}"`, (err2, response2) => {
                if (err2) {
                    return res.status(500).json({ err: err })
                } else {

                    for (let join of response2) {
                        if (join.user_id == req.user.user_id) {
                            return res.status(500).json({ err: 'Cannot join RSO that you have already joined' })
                        }
                    }

                    connection.query(`INSERT INTO joins (user_id, rso_id, admin_id) VALUES ("${req.user.user_id}", "${rso_id}", "${response[0].user_id}")`, (err3, response3) => {
                        if (err3) {
                            return res.status(500).json({ err: err3 })
                        } else {
                            return res.status(200).json({ response: response3, err: '' })
                        }
                    })
                }
            })

        }
    })
})


module.exports = router

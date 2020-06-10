require('dotenv').config()
const MongoClient = require('mongodb').MongoClient;
const mongo = new MongoClient(process.env.DB_URL, { useUnifiedTopology: true })
const OpenTok = require('opentok')
const OT = new OpenTok(process.env.API_KEY, process.env.API_SECRET)

exports.handler = async(event, context) => {
  try {
    if(event.httpMethod == 'OPTIONS') {
      return {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Allow': 'POST'
        },
        statusCode: 204
      }
    }

    const { name } = JSON.parse(event.body)

    await mongo.connect()
    const sessions = await mongo.db('mlh').collection('sessions')

    let session = await sessions.findOne({ name: name })
    
    if(!session) {
      const newSession = await createSession()
      await sessions.insertOne({ 
        name: name, 
        sessionId: newSession.sessionId 
      })
      session = {
        name, 
        sessionId: newSession.sessionId
      }
    }

    const token = OT.generateToken(session.sessionId, {
      role: 'publisher'
    })
    
    return {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      statusCode: 200,
      body: JSON.stringify({
        apiKey: process.env.API_KEY,
        sessionId: session.sessionId,
        token: token
      })
    }
  } catch(e) {
    console.log(e);
    return {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      statusCode: 500,
      body: 'Error: ' + e 
    }
  }
}

const createSession = () => {
  return new Promise((resolve, reject) => {
    try {
      OT.createSession((error, session) => {
        if(error) reject(error)
        else resolve(session)
      })
    } catch(e) {
      reject(e)
    }
  })
}
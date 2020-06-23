import express from 'express'
import AWS from 'aws-sdk'
import 'dotenv/config.js'
import { promises } from 'dns'

const app = express()
const PORT = process.env.PORT

let bucket = 'divrt-lpr'
let trunc = false

AWS.config.update({
    accessKeyId: process.env.AWS__ACCESSKEYID,
    secretAccessKey: process.env.AWS__SECRETACCESSKEY
})
let s3 = new AWS.S3()

app.get('/:bucket?', (req, res) => {
    console.log('starting app')

    if (req.query.list) {
        s3.listBuckets({}).promise()
        .then(results => {
            console.log(results)
            let startHTML = '<html style="font-family: monospace; font-size: 2em; "><body><ul style="list-style-type: square">Bucket List: <br>'
            let endHTML = '</ul></body></html>'
            let innerHTML = results.Buckets.map(bucket => bucket.Name) 
            let html = startHTML + '<br><li>' + innerHTML.join('</li><br><li>') + '</li>' + endHTML
            return res.send(html)
        })
        .catch(console.log)

    } else {

        bucket = req.params.bucket || bucket
        trunc = req.query.trunc || trunc
        console.log({bucket})
        
        listAllKeys({Bucket: bucket})
            // .then((list) => getAllImages(list))
            // .then((images) => buildPage(images))
            // .then((html) => res.send(html))
            // .catch((e) => res.send(e))
            .then(getAllImages)
            .then(buildPage)
            .then((html) => res.send(html))
            .catch((e) => res.send(e))
    }
})

app.listen(PORT, () => {
    console.log(`Web Server running on port ${PORT}`)
})

// const listAllKeys = (params, out = []) => new Promise((resolve, reject) => {
function listAllKeys(params, out=[]) {
    return new Promise((resolve, reject) => {
        s3.listObjectsV2(params).promise()
        .then(({Contents, IsTruncated, NextContinuationToken}) => {
            out.push(...Contents);
            !IsTruncated ? resolve(out) : resolve(listAllKeys(Object.assign(params, {ContinuationToken: NextContinuationToken}), out));
        })
        .catch(reject);
    })
}

function getAllImages(list) {
    console.log({list})
    let promises = list.slice(-trunc).map(f => getImage({Bucket: bucket, Key: f.Key}))
    return Promise.all(promises)
}

function getImage(params) {
    // const data = s3.getObject(params).promise();
    // return data;
    return s3.getObject(params).promise()
    .then((data) => {
        return Object.assign(data, {Key: params.Key})
    })
    .catch((e) => console.log(e))
}

function buildPage(images) {
    // console.log(images)
    let startHTML = '<html><body><ul style="list-style-type: none">Image List: '
    let endHTML = '</ul></body></html>'
    let innerHTML = images.map( (img) => `
        <figure>
        <img style="width:70%" src="data:image/jpeg;base64,${encode(img.Body)}"/>
        <figcaption>${img.Key}, ${img.ContentLength} bytes</figcaption>
        </figure>`)
    let html = startHTML + '<li>' + innerHTML.join('</li><br><li>') + '</li>' + endHTML
    return html
}

function encode(data){
    let buf = Buffer.from(data);
    let base64 = buf.toString('base64');
    return base64
}

const router = require("express").Router();
const cheerio = require("cheerio");
const fs = require("fs");
const filepath = require("../config").DATA_PATH;
const {sendToDIA, saveToJSON, getIntelligenceObject} = require('../utils');

/* GET users listing. */
router.post("/", function(req, res) {
  // Agent collected Intelligences
  let collectedIntelligences = req.body;
  // Intelligences that need collected by Agent
  let needCollectIntelligences = [];
  // Collected
  let collectedData = [];

  for (let i = 0; i < collectedIntelligences.length; i++) {
    let item = collectedIntelligences[i];
    let data = item.dataset.data.content;
    // You can find how to use cheerio from https://cheerio.js.org/
    // cheerio: Fast, flexible & lean implementation of core jQuery designed specifically for the server.
    let $ = cheerio.load(data);

    /*
    getIntelligenceObject(url, priority, metadata, suitableAgents, permission) will return an intelligence object
    url: string
    priority: integer
    metadata: object
    suiteableAgents: array. A sub array of ["BROWSEREXTENSION", "SERVICE", "HEADLESSBROWSER"], default is ["BROWSEREXTENSION", "SERVICE", "HEADLESSBROWSER"]
    permission: string. 'PUBLIC' OR 'PRIVATE', default is 'PUBLIC'
    */

    // Add you logic to process collect data
    // Following is an example of crawl articles from "http://exampleblog.munew.io/"
    /*  */
    let targetBaseURL = "http://exampleblog.munew.io/";
    if (item.metadata.type == "bloglist") {
      // get all blogs url in blog list page
      let blogUrls = $("div.post-preview a");
      for (let i = 0; i < blogUrls.length; i++) {
        let $blog = blogUrls[i];
        $blog = $($blog);
        let url = new URL($blog.attr("href"), targetBaseURL).toString();
        needCollectIntelligences.push(
          getIntelligenceObject(url, 2, {
            type: "blog"
          })
        );
      }
      let nextUrl = $("ul.pager li.next a").attr("href");
      if (nextUrl) {
        nextUrl = new URL(nextUrl, targetBaseURL).toString();
        needCollectIntelligences.push(
          getIntelligenceObject(nextUrl, 1, {
            type: "bloglist"
          })
        );
      }
    } else if (item.metadata.type == "blog") {
      collectedData.push({
        title: $("div.post-heading h1").text(),
        author: $("div.post-heading p.meta span.author").text(),
        date: $("div.post-heading p.meta span.date").text(),
        content: $("div.post-container div.post-content").text(),
        url: item.dataset.url
      });
    } else {
      console.error("unknown type");
    }
    
  }

  // Send intelligences back to DIA
  if (needCollectIntelligences.length) {
    sendToDIA(needCollectIntelligences, function(result) {
      console.log("needCollectIntelligences result: ", result);
    });
  }

  // Save collect data to JSON file
  if (collectedData.length) {
    saveToJSON(collectedData);
  }

  // response back 200
  res.status(200).end();
});

router.post("/init", function(req, res, next) {
  fs.access(filepath, fs.F_OK, function(err) {
    if (!err) {
      fs.unlinkSync(filepath);
    }
  });

  let needCollectIntelligences = [];

  // Add you initial intelligences
  // Following is an init intelligence for crawl articls from "http://exampleblog.munew.io/"
  /* */
  let targetBaseURL = "http://exampleblog.munew.io/";
  needCollectIntelligences.push(
    getIntelligenceObject(targetBaseURL, 1, {
      type: "bloglist"
    })
  );
  

  if (needCollectIntelligences.length) {
    sendToDIA(needCollectIntelligences, function(result) {
      res.json(result);
    });
  } else {
    // No intelligences created
    res.json([]);
  }
});

module.exports = router;

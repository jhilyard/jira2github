// usage: node index.js path-to-jira-xml.xml
// the xml file extension is required! 
// this prevents overwriting the input xml with json

const path = require('path');

const inputXMLPath = process.argv[2];
if (path.extname(inputXMLPath).toLowerCase() != '.xml') {
    console.log('Input file extension is ' + path.extname(inputXMLPath).toLowerCase())
    console.log('Input filename must have .xml file extension')
    return;
}
const { Octokit } = require('@octokit/rest');

const homedir = require('os').homedir();
const fs = require('fs');
// temporary: parse the oauth token from the Github CLI hosts config file
const yaml = require('js-yaml');
// Jira exports XML
const xml2js = require('xml2js');
// Jira rich text fields like Description are exported as HTML snippets
const TurndownService = require('turndown');
const turndownService = new TurndownService();
const parser = new xml2js.Parser();
const inputContents = fs.readFileSync(inputXMLPath,'utf-8');
parser.parseStringPromise(inputContents).then(function(jiraItemRSS) {
    let jiraItems = jiraItemRSS.rss.channel[0].item;
    fs.writeFileSync(inputXMLPath.replace(/\.xml$/i,'.json'),JSON.stringify(jiraItems));
    let data;
    try {
        data = yaml.load(fs.readFileSync(path.join(homedir,'.config','gh','hosts.yml'),'utf-8'));
    } catch (e) {
        console.log(e);
        return;
    }
    let token = data["github.com"].oauth_token;
    const octokit = new Octokit({
        auth: token,
        userAgent: 'jira2github 1.0.0',
        timeZone: 'America/New_York'
    });
    jiraItems.forEach(element => {
        octokit.issues.create({
            owner:'tcob',
            repo:'TerryIssues',
            title: element.title[0],
            body: turndownService.turndown(element.description[0]),
            milestone: 1
        });
    });    
});


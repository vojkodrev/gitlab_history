const { Gitlab } = require("gitlab");
const elegantSpinner = require('elegant-spinner');
const frame = elegantSpinner();
const logUpdate = require('log-update');
const JiraApi = require('jira-client');
const util = require('util')
var Prompt = require('prompt-password');

function spin() {
  logUpdate(frame());
}

(async () => {

  const api = new Gitlab({
    token: '4tnUdiSv-xhazYfMJzxF',
    host: 'https://git.adacta-group.com'
  });

  const jiraPasswordPrompt = new Prompt({
    type: 'password',
    message: 'Enter your JIRA password please',
    name: 'password'
  });

  const jira = new JiraApi({
    protocol: 'https',
    host: 'jira.adacta-group.com',
    username: 'vojkod',
    password: await jiraPasswordPrompt.run(),
    apiVersion: '2',
    strictSSL: false
  });

  spin();
  
  let projects = await api.Projects.all({
    search: "Sava"
  });

  let savaImplProject = projects.filter(p => p.name_with_namespace == "Sava / Implementation")[0];
  
  spin();

  let pipelines = await api.Pipelines.all(savaImplProject.id, {
    username: "VojkoD",
    maxPages: 2
  })

  spin();

  let commitPromises = [];
  let distinctCommitIds = new Set();

  pipelines.forEach(p => {
    distinctCommitIds.add(p.sha)
  })

  distinctCommitIds.forEach(id => {
    commitPromises.push(new Promise(async (resolve, reject) => {
      try { resolve(await api.Commits.show(savaImplProject.id, id)) } catch (err) { reject(err) }
      spin()
    }));
  })

  let commits = await Promise.all(commitPromises);

  let commitDetailPromises = [];

  commits.forEach(c => {
    commitDetailPromises.push(new Promise(async (resolve, reject) => {
      try {
        let mergeReqId = /refs\/merge-requests\/(\d+)\/head/g.exec(c.last_pipeline.ref)

        let result = {
          commit: c,
          refName: c.last_pipeline.ref
        };

        if (mergeReqId) {
          mergeRequest = await api.MergeRequests.show(savaImplProject.id, mergeReqId[1]);
          spin();
          result.mergeRequest = mergeRequest;
          result.refName = result.mergeRequest.title; 

          let jiraId = /LJADISAVA-\d+/g.exec(result.refName)

          if (jiraId) {
            const jiraIssue = await jira.findIssue(jiraId);
            spin();
            result.jiraIssue = jiraIssue;
          }
        } 

        resolve(result)
      } catch (err) {
        spin();
        reject(err);
      }
    }));
  })
  
  let commitDetails = await Promise.all(commitDetailPromises);

  commitDetails.forEach(cd => {
    
    console.log(cd.commit.created_at, "[", cd.refName, "]", 
      cd.jiraIssue ? `[ ${cd.jiraIssue.fields.summary} ]` : "",
      cd.commit.message)
  })
  
})();
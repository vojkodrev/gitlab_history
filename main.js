const { Gitlab } = require("gitlab");
const elegantSpinner = require('elegant-spinner');
const frame = elegantSpinner();
const logUpdate = require('log-update');
// const JiraClient = require("jira-connector");
const JiraApi = require('jira-client');
const util = require('util')
const Prompt = require('prompt-password');
const colors = require('colors');

function spin() {
  // logUpdate(frame());
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

  const jiraPassword = await jiraPasswordPrompt.run();

  const jira = new JiraApi({
    protocol: 'https',
    host: 'jira.adacta-group.com',
    username: 'vojkod',
    password: jiraPassword,
    apiVersion: '2',
    strictSSL: false
  });

  // const jira = new JiraClient({
  //   host: "jira.adacta-group.com",
  //   protocol: 'https',
  //   strictSSL: false,
  //   basic_auth: {
  //     username: "vojkod",
  //     password: jiraPassword
  //   }
  // });

  spin();

  console.log(1);
  
  let projects = await api.Projects.all({
    search: "Sava"
  });
  
  console.log(2);

  let savaImplProject = projects.filter(p => p.name_with_namespace == "Sava / Implementation")[0];
  
  spin();

  let pipelines = await api.Pipelines.all(savaImplProject.id, {
    username: "VojkoD",
    maxPages: 8
  })

  console.log(3);

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

  console.log(4);

  let commits = await Promise.all(commitPromises);

  console.log(5);

  let commitDetailPromises = [];
  
  function getJiraIssue(name) {
    return new Promise(async (resolve, reject) => {
      if (jiraPassword) {
        let jiraId = /LJADISAVA-\d+/g.exec(name)
  
        if (jiraId) {
          try {
            const jiraIssue = await jira.findIssue(jiraId[0]);
            // const jiraIssue = await jira.issue.getIssue({issueId: jiraId[0]});
            // console.log("jiraIssue", jiraIssue)
            // process.exit(1)
            spin();
            resolve(jiraIssue);

            // if (!jiraIssue) {
            //   reject("No jira issue found for " + jiraId[0]);
            // } else {
            // }
          } catch (err) {
            spin();
            reject(err);
          }
        } else {
          reject("No jira id");  
        }
      } else {
        reject("No jira password");
      }
    })
  }

  commits.forEach(c => {
    commitDetailPromises.push(new Promise(async (resolve, reject) => {
      try {
        console.log(5.1);
        let mergeReqId = /refs\/merge-requests\/(\d+)\/head/g.exec(c.last_pipeline.ref)

        const result = {
          commit: c,
          refName: c.last_pipeline.ref
        };

        console.log(5.2);

        if (mergeReqId) {
          console.log(5.21);
          const mergeRequest = await api.MergeRequests.show(savaImplProject.id, mergeReqId[1]);
          console.log(5.22);
          spin();
          result.mergeRequest = mergeRequest;
          result.refName = result.mergeRequest.title; 
          console.log(5.23);
        } 

        try {
          console.log(5.3,result.refName);
          result.jiraIssue = await getJiraIssue(result.refName);
          console.log(5.4);
        } catch (err) { 
          console.log(5.411, err) 
        }

        resolve(result)
        console.log(5.5);

      } catch (err) {
        console.log(5.6);

        spin();
        reject(err);
      }
    }));
  })
  
  let commitDetails = await Promise.all(commitDetailPromises); //.catch(e => console.log(e));

  console.log(7);

  commitDetails.forEach(cd => {
  
    // if (parseInt(cd.commit.created_at.substring(8, 10)) % 2 == 0) {
    //   process.stdout.write("\x1b[33m");
    // } else {
    //   process.stdout.write("\x1b[0m");
    // }

    let asdasd = cd.jiraIssue ? `[${cd.jiraIssue.fields.summary}] ` : "";
    let message = `${cd.commit.created_at} [${cd.refName}] ${asdasd}${cd.commit.message}`;

    if (parseInt(cd.commit.created_at.substring(8, 10)) % 2 == 0) {
      console.log(message.cyan)
    } else {
      console.log(message)
    }
  })

  console.log(8);

  // process.stdout.write("\x1b[0m");
  
})().catch(console.error)

const { Gitlab } = require("gitlab");
const elegantSpinner = require('elegant-spinner');
const frame = elegantSpinner();
const logUpdate = require('log-update');

function spin() {
  logUpdate(frame());
}

(async () => {

  const api = new Gitlab({
    token: '4tnUdiSv-xhazYfMJzxF',
    host: 'https://git.adacta-group.com'
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
        };

        if (mergeReqId != null) {
          mergeRequest = await api.MergeRequests.show(savaImplProject.id, mergeReqId[1]);
          result.mergeRequest = mergeRequest;
        } 

        resolve(result)
      } catch (err) {
        reject(err);
      }

      spin();
    }));
  })
  
  let commitDetails = await Promise.all(commitDetailPromises);

  commitDetails.forEach(cd => {
    let refName = cd.mergeRequest ? cd.mergeRequest.title : cd.commit.last_pipeline.ref; 
    console.log(cd.commit.created_at, "[", refName, "]" , cd.commit.message)
  })
  
})();
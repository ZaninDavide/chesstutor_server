const MongoClient = require('mongodb').MongoClient;
const uri = "mongodb://zanin:3VQ8KoUK2oit4Vbt@chesstutorcluster-shard-00-00-b868c.mongodb.net:27017,chesstutorcluster-shard-00-01-b868c.mongodb.net:27017,chesstutorcluster-shard-00-02-b868c.mongodb.net:27017/test?ssl=true&replicaSet=chesstutorCluster-shard-0&authSource=admin&retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true });
client.connect(err => {
    console.log(err)
    if(err) return
    
    const collection = client.db("test").collection("devices");
    // perform actions on the collection object
    console.log("I'm here")
    client.close();
});
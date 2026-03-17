import Redis from "ioredis";

const redisClient = new Redis({
    host:"localhost",
    port:6379
})
redisClient.on("connect",()=>{
    console.log("redis connected sucessfully!");
})

redisClient.on("error",(err)=>{
    console.log("error occured in redis connection", err);
})
 export default redisClient;
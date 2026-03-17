import redisClient from "../Config/redis.config.js";
import ApiError from "../utils/ApiError.js";
// import moment from "moment";

// otp rateLimiting logic--- in 1 minute only 3 send otp calls are allowed

const RATE_LIMIT_DURATION_IN_SECONDS = 60;
 const NUMBER_OF_REQUESTS_ALLOWED = 3;
 const OTP_TTL_IN_SECONDS = 300;

  const rateLimiter = async( req, res, next)=>{
    const currentTime  = Date.now();
    const {phoneNumber  } = req.body;
       if(!phoneNumber){
          throw new ApiError(400,"phone number is required ");
       }
    // checking if it is  first call  of user to the api or not
      const result = await redisClient.hgetall(`otpRL:${phoneNumber}`);
         if(Object.keys(result).length === 0){
            await  redisClient.hset(`otpRL:${phoneNumber}`,{
                createdAt: currentTime ,
                count:1
            }
        )
         await redisClient.expire(`otpRL:${phoneNumber}`,OTP_TTL_IN_SECONDS);
            return next();
         }
         
            const timeDiff = currentTime-Number(result["createdAt"]);
            if( timeDiff < RATE_LIMIT_DURATION_IN_SECONDS  * 1000){
                if(Number(result["count"])< NUMBER_OF_REQUESTS_ALLOWED){
                await redisClient.hset(`otpRL:${phoneNumber}`,{
                    // createdAt:currentTime, --------> no need to re initialise created At once again
                    count:Number(result["count"])+1
                })
                // await redisClient.expire(`otp:${phoneNumber}`,OTP_TTL_IN_SECONDS);
                return next();
                  }
                 else {
                  return res.status(429).json({message:"rate limit exceeded", success:false, statusCode:429})
                  }
            }
            else{
                await redisClient.hset(`otpRL:${phoneNumber}`,{
                    createdAt:currentTime,
                    count:1
                })
                await redisClient.expire(`otpRL:${phoneNumber}`,OTP_TTL_IN_SECONDS);
                return next();
            }
            
         
 }

 export {rateLimiter}
import { AsyncHandler } from "../utils/AsynHandler";
import prisma from "../lib/prisma";
import ApiError from "../utils/ApiError";
import ApiResponse from "../utils/ApiResponse"

const generateReceipt = AsyncHandler(async(req,res)=>{
   const quantity = req.body.quantity;
      if(!quantity) throw new ApiError(403,"invalid quantity");
     if(!req.user || !req.user.id)throw new ApiError(403,"unauthorised access");
     const user_id = req.user.id;
     const crop_id = req.params.cropId;
     if(!crop_id) throw new ApiError(401,"crop id not available at params");
      const crop = await prisma.Crops.findFirst({
        where:{
            id:crop_id,
           deleted_At:null
        }
      })
      if(!crop) throw new ApiError(402,"no such crop availabale");
      const cropPrice =  crop.price;
      //  const  listerId = crop.traderId? crop.traderId : crop.organisationId;
      //  generating receipt
      const receipt= await prisma.Receipt.create({
      data: { crop_id:crop_id,
        crop_price:cropPrice,
        farmer_id:user_id,
        crop_quantity:quantity
      }
      })
     return res.status(200).json(new ApiResponse(200,receipt,"receipt generated successfully") );
})


export {generateReceipt}
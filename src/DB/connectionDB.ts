import mongoose from "mongoose";


export const connectionDB=async ()=>{
    mongoose.connect(process.env.DB_URL as unknown as string)
    .then(()=>{
        console.log(`success to connect to DB ${process.env.DB_URL} 😁`);
        
    })
    .catch((error)=>{
        console.log(`failed to connect to DB 😖` , error);
        
    })
}
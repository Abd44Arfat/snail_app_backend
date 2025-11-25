import mongoose, { Types } from "mongoose";

const schema = new mongoose.Schema({
    name: {
        type: String,
        unique: [true, 'category name must be unique'],
        trim: true,
        required: true,
        minlength: [2, 'too short category name'],
    },
    email: {
        type: String,
        lowercase: true,
        required: true,
    },
    Password: {
        type: String,
        lowercase: true,
        required: true,


    },
    image: {type:String,
    },

}, { timesstamps: true, versionKey: false });

schema.post('init',function(doc){
// doc.image=process.env.BASE_URL+"categories/" + doc.image
doc.image="http://localhost:3000/uploads/"+"categories/" + doc.image

})

export const User = mongoose.model('User', schema);
import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
    categoryName: {type: String, required: true},
    categoryDescription: {type: String, required: false},
    active: {type: Boolean, default: true}
}, {
    timestamps: true
})


const CategoryModel = mongoose.model("Category", categorySchema)
export default CategoryModel
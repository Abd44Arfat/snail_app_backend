import { catchError } from "../../middleware/catchError.js"
import { AppError } from "../../utils/appError.js"
export const deleteOne = (model, title) => {
  return catchError(async (req, res, next) => {
    const document = await model.findByIdAndDelete(req.params.id);

    if (!document) {
      return next(new AppError(`${title} not found`, 404));
    }

    return res.json({ message: "success", document });
  });
};




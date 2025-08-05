// import { v2 as cloudinary } from "cloudinary";

// import { config } from "dotenv";

// config();

// cloudinary.config({
//   cloud_name: process.env.dfkoun6xv,
//   api_key: process.env.865475913539882,
//   api_secret: process.env.X35OrDiNGeZ4GdHf72fU0xVCPk4,
// });

// export default cloudinary;
import { v2 as cloudinary } from "cloudinary";
import { config } from "dotenv";

config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ Export cloudinary as default
export default cloudinary;

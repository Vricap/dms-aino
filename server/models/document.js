import mongoose from "mongoose";

const DocumentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      unique: true,
      trim: true,
    },
    content: {
      type: String,
      required: [true, "Content is required"],
      trim: true,
    },
    division: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      required: [true, "Document type is required"],
      trim: true,
      enum: {
        values: [
          "ADD",
          "BA",
          "SKU",
          "JO",
          "KK",
          "KW",
          "MOM",
          "MOU",
          "NC",
          "ND",
          "PENG",
          "PEM",
          "PB",
          "PM",
          "PN",
          "NDA",
          "PKS",
          "PR",
          "PNW",
          "PO",
          "PT",
          "SK",
          "SKT",
          "SP",
          "SPI",
          "SPK",
          "SPR",
          "SR",
          "SE",
          "PNG",
          "SERT",
          "TAG",
          "U",
          "ST",
          "PQ",
          "PJ",
          "CL",
        ],
        message: "Use valid document type",
      },
    },
    access: {
      type: String,
      required: [true, "Access type is required"],
      default: "public",
      enum: {
        values: ["public", "private"],
        message: "Use a valid access type",
      },
    },
    uploader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Author ID is required"],
    },
    status: {
      type: String,
      required: [true, "Status is required"],
      enum: {
        values: ["saved", "sent", "complete"],
        message: "Status in invalid",
      },
    },
    receiver: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        dateSent: {
          type: Date,
        },
        dateSigned: {
          type: Date,
        },
      },
    ],
    dateExpired: {
      type: Date,
    },
    pointer: {
   		page: {
    		type: Number,
    	},
    	x: {
    		type: Number,
    	},
    	y: {
    		type: Number,
    	},
    	width: {
    		type: Number,
    	},
    	height: {
    		type: Number,
    	},
    },
  },
  {
    timestamps: true, // Optional: adds createdAt and updatedAt fields
  },
);

const Document = mongoose.model("Document", DocumentSchema);
export default Document;

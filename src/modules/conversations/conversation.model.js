const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    participants: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        }
      ],
      validate: {
        validator: (value) => Array.isArray(value) && value.length >= 2,
        message: 'Conversation must include at least two participants'
      }
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job'
    },
    lastMessageSnippet: String,
    lastMessageAt: Date,
    unreadCounts: {
      type: Map,
      of: Number,
      default: () => new Map()
    }
  },
  { timestamps: true }
);

conversationSchema.index({ participants: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);

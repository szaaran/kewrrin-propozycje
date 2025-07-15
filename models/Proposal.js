const mongoose = require('mongoose');

const ProposalSchema = new mongoose.Schema({
  authorId: String,
  authorTag: String,
  content: String,
  status: { type: String, default: 'pending' }, 
  createdAt: { type: Date, default: Date.now },
  messageId: String,  
});

module.exports = mongoose.model('Proposal', ProposalSchema);

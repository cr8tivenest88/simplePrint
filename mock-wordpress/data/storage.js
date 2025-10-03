// In-memory storage (replace with SQLite if needed)
const users = [
  { id: 1, username: 'customer1', password: 'pass123', role: 'customer', company_id: 1 },
  { id: 2, username: 'agent1', password: 'pass123', role: 'agent', company_id: 1 },
  { id: 3, username: 'admin', password: 'pass123', role: 'admin', company_id: null }
];

const quotes = [];
let quoteIdCounter = 1;

module.exports = {
  users,
  quotes,
  getNextQuoteId: () => quoteIdCounter++,
  findUserByUsername: (username) => users.find(u => u.username === username),
  findUserById: (id) => users.find(u => u.id === id),
  saveQuote: (quote) => {
    quote.id = module.exports.getNextQuoteId();
    quote.created_at = new Date().toISOString();
    quotes.push(quote);
    return quote;
  },
  getQuotesByUser: (userId, role, companyId) => {
    if (role === 'admin') return quotes;
    if (role === 'agent') return quotes.filter(q => q.company_id === companyId);
    return quotes.filter(q => q.user_id === userId);
  }
};

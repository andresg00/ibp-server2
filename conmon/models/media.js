function validateDate(date) {
  const validDate =
    date instanceof Date && !isNaN(date.getTime())
      ? date.toISOString()
      : new Date().toISOString();
  return validDate;
}
module.exports = { validateDate };

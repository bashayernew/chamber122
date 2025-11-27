/**
 * Admin Fix Emails - Manually fix user emails in localStorage
 * Run this in browser console to fix emails
 */

export function fixUserEmails() {
  const users = JSON.parse(localStorage.getItem('chamber122_users') || '[]');
  const emailMap = {
    '7b05ea87-a823-4fef-93e3-c4a89d2cbff5': 'fatima@123123.com', // Fatima's user ID
    // Add more mappings as needed
  };
  
  let fixed = 0;
  users.forEach((user, index) => {
    if (emailMap[user.id] && user.email.includes('@chamber122.com')) {
      console.log(`Fixing email for user ${user.id}: ${user.email} -> ${emailMap[user.id]}`);
      users[index].email = emailMap[user.id];
      fixed++;
    }
  });
  
  if (fixed > 0) {
    localStorage.setItem('chamber122_users', JSON.stringify(users));
    console.log(`Fixed ${fixed} user email(s)`);
    return { fixed, users };
  } else {
    console.log('No emails to fix');
    return { fixed: 0, users };
  }
}

// Make available globally
if (typeof window !== 'undefined') {
  window.fixUserEmails = fixUserEmails;
}






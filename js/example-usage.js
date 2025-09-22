// Example usage of the new events and bulletins system
// This file demonstrates how to create events and bulletins without manually setting business_id

import { supabase } from '/js/supabase-client.js';

// Example: Create an event (NO business_id needed)
async function createEvent() {
  try {
    const { data, error } = await supabase.from('events').insert({
      title: 'Grand Opening',
      description: 'Ribbon cutting ceremony',
      location: 'Kuwait City Mall',
      start_at: new Date(Date.now() + 2*24*3600*1000).toISOString(),
      end_at: new Date(Date.now() + (2*24*3600 + 2*3600)*1000).toISOString(),
      is_published: true,
      status: 'published'
      // NO business_id needed - trigger will automatically set it!
    });
    
    if (error) throw error;
    console.log('Event created:', data);
  } catch (error) {
    console.error('Error creating event:', error);
  }
}

// Example: Create a bulletin (NO owner_business_id needed)
async function createBulletin() {
  try {
    const { data, error } = await supabase.from('bulletins').insert({
      type: 'announcement',
      title: 'New Product Launch',
      description: 'We are excited to announce our latest product line',
      location: 'Online',
      deadline_date: new Date(Date.now() + 7*24*3600*1000).toISOString(),
      status: 'published',
      tags: ['announcement', 'product', 'launch']
      // NO owner_business_id needed - trigger will automatically set it!
    });
    
    if (error) throw error;
    console.log('Bulletin created:', data);
  } catch (error) {
    console.error('Error creating bulletin:', error);
  }
}

// Example: What happens if user has no business profile
async function createEventWithoutBusiness() {
  try {
    const { data, error } = await supabase.from('events').insert({
      title: 'This will fail',
      description: 'User has no business profile',
      start_at: new Date(Date.now() + 24*3600*1000).toISOString(),
      is_published: false,
      status: 'draft'
    });
    
    console.log('This should not print - error should be thrown');
  } catch (error) {
    console.log('Expected error:', error.message);
    // Should print: "No business found for the current user. Create your business profile first."
  }
}

export { createEvent, createBulletin, createEventWithoutBusiness };

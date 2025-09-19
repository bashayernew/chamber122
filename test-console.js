// 🧪 Supabase Integration Test Script
// Run this in your browser console to test the migration

console.log('🧪 Starting Supabase Integration Test...');

// Test 1: Business Query
async function testBusinessQuery() {
    console.log('\n1️⃣ Testing Business Query...');
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        
        if (!user) {
            console.log('❌ No authenticated user found. Please log in first.');
            return;
        }

        const { data, error } = await supabase
            .from('businesses')
            .select('id,name,owner_id,is_active,created_at')
            .eq('owner_id', user.id)
            .limit(1);

        if (error) throw error;

        if (data && data.length > 0) {
            console.log('✅ Business query successful!');
            console.log('Business data:', data[0]);
        } else {
            console.log('ℹ️ No business found for this user (normal for new users)');
        }
    } catch (error) {
        console.error('❌ Business query failed:', error.message);
    }
}

// Test 2: File Upload
async function testFileUpload() {
    console.log('\n2️⃣ Testing File Upload...');
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        
        if (!user) {
            console.log('❌ No authenticated user found. Please log in first.');
            return;
        }

        // Create test file
        const file = new File(["Hello from Supabase test!"], "test.txt", { type: "text/plain" });
        const path = `${user.id}/smoketest-${Date.now()}.txt`;
        
        const { data, error } = await supabase.storage
            .from('business-files')
            .upload(path, file, { upsert: true });

        if (error) throw error;

        console.log('✅ File upload successful!');
        console.log('File path:', data.path);
        console.log('Full URL: business-files/' + data.path);
    } catch (error) {
        console.error('❌ File upload failed:', error.message);
        console.log('💡 Make sure the "business-files" bucket exists in your Supabase Dashboard');
    }
}

// Test 3: Compatibility View
async function testCompatibilityView() {
    console.log('\n3️⃣ Testing Compatibility View...');
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        
        if (!user) {
            console.log('❌ No authenticated user found. Please log in first.');
            return;
        }

        const { data, error } = await supabase
            .from('accounts')
            .select('id,name,owner_user_id,status,is_active')
            .eq('owner_user_id', user.id)
            .limit(1);

        if (error) throw error;

        if (data && data.length > 0) {
            console.log('✅ Compatibility view working!');
            console.log('Account data:', data[0]);
        } else {
            console.log('ℹ️ No data found in compatibility view');
        }
    } catch (error) {
        console.error('❌ Compatibility view failed:', error.message);
    }
}

// Test 4: Error Handling
async function testErrorHandling() {
    console.log('\n4️⃣ Testing Error Handling...');
    try {
        // Test with invalid table name
        const { data, error } = await supabase
            .from('invalid_table')
            .select('*')
            .limit(1);

        if (error) {
            console.log('✅ Error handling working!');
            console.log('Error caught:', error.message);
        } else {
            console.log('ℹ️ No error occurred (unexpected)');
        }
    } catch (error) {
        console.log('✅ Error handling working!');
        console.log('Exception caught:', error.message);
    }
}

// Run all tests
async function runAllTests() {
    console.log('🚀 Running all tests...');
    await testBusinessQuery();
    await testFileUpload();
    await testCompatibilityView();
    await testErrorHandling();
    console.log('\n✨ All tests completed!');
}

// Export functions for manual testing
window.testBusinessQuery = testBusinessQuery;
window.testFileUpload = testFileUpload;
window.testCompatibilityView = testCompatibilityView;
window.testErrorHandling = testErrorHandling;
window.runAllTests = runAllTests;

console.log('📋 Available test functions:');
console.log('- testBusinessQuery()');
console.log('- testFileUpload()');
console.log('- testCompatibilityView()');
console.log('- testErrorHandling()');
console.log('- runAllTests()');
console.log('\n💡 Run runAllTests() to test everything at once!');

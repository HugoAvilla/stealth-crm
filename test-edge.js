import { createClient } from "@supabase/supabase-js"

const supabaseUrl = "https://msdpmhtdjyoqdmjwunkm.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zZHBtaHRkanlvcWRtand1bmttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MTExMDAsImV4cCI6MjA4NTE4NzEwMH0.I4yFF1kMUWV589x58iLDsnb-87m5FX_apBUU4j7cHck"

const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
    console.log("Invoking edge function...")
    const { data, error } = await supabase.functions.invoke("create-employee-user", {
        body: {
            email: "test.api@gmail.com",
            password: "Testpassword123!",
            name: "Test API User",
            role_title: "TEST",
            whatsapp: "123456789",
            birth_date: "1990-01-01",
            companyId: "bd4df3aa-8d96-4db0-9ae2-2259af2f2323", // placeholder
            locked_modules: [],
            address: { cep: "" }
        }
    })

    if (error) {
        console.error("Invoke Error:")
        console.dir(error, { depth: null })
        try {
            const contextText = await error.context?.text()
            console.log("Context:", contextText)
        } catch (e) { }
    } else {
        console.log("Success:", data)
    }
}

test()

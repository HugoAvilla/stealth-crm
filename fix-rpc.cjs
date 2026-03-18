const https = require('https');

const supabaseUrl = "msdpmhtdjyoqdmjwunkm.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zZHBtaHRkanlvcWRtand1bmttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MTExMDAsImV4cCI6MjA4NTE4NzEwMH0.I4yFF1kMUWV589x58iLDsnb-87m5FX_apBUU4j7cHck";

const data = JSON.stringify({
  query: `
    CREATE OR REPLACE FUNCTION public.unlink_company_member(target_user_id uuid)
    RETURNS void AS $$
    DECLARE
        v_company_id bigint;
        v_is_owner boolean;
    BEGIN
        -- Get the target user's company and check if they are the owner
        SELECT 
            p.company_id,
            COALESCE(c.owner_id = p.user_id, false)
        INTO 
            v_company_id,
            v_is_owner
        FROM profiles p
        LEFT JOIN companies c ON c.id = p.company_id
        WHERE p.user_id = target_user_id;

        IF v_company_id IS NULL THEN
            RAISE EXCEPTION 'Usuário não está vinculado a nenhuma empresa';
        END IF;

        IF v_is_owner THEN
            RAISE EXCEPTION 'Não é possível desvincular o dono da empresa';
        END IF;

        -- Check if the CURRENT user is the owner of the company
        IF target_user_id != auth.uid() THEN
            IF NOT EXISTS (
                SELECT 1 FROM companies 
                WHERE id = v_company_id 
                AND owner_id = auth.uid()
            ) THEN
                RAISE EXCEPTION 'Apenas o dono da empresa pode desvincular membros';
            END IF;
        END IF;

        -- Update the join request status to rejected so it does not violate the "pending, approved, rejected" constraint
        -- We use 'rejected' along with a rejected reason indicating they were unlinked
        UPDATE company_join_requests
        SET 
            status = 'rejected',
            rejected_reason = 'Desvinculado pela empresa'
        WHERE 
            requester_user_id = target_user_id 
            AND company_id = v_company_id;

        -- Remove the user from the company
        UPDATE profiles
        SET company_id = NULL
        WHERE user_id = target_user_id;
        
        -- Also clear out the role
        UPDATE user_roles
        SET role = 'NENHUM'
        WHERE user_id = target_user_id;
        
        -- And handle subscription cleanup if needed
        -- Note: this might not exist or we might want to just set it to pending_payment
        UPDATE subscriptions
        SET company_id = NULL, status = 'pending_payment'
        WHERE user_id = target_user_id;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `
});

const options = {
  hostname: supabaseUrl,
  path: '/rest/v1/sql',
  method: 'POST',
  headers: {
    'apikey': supabaseKey,
    'Authorization': 'Bearer ' + supabaseKey,
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  let resData = '';
  res.on('data', (chunk) => resData += chunk);
  res.on('end', () => console.log('SQL Exec Result:', resData));
});

req.on('error', (e) => console.error(e));
req.write(data);
req.end();

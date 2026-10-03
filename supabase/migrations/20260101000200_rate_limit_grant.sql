-- Server (service role) calls the rate limiter; keep it closed to anon/authenticated.
grant execute on function check_rate_limit(text, int, interval) to service_role;

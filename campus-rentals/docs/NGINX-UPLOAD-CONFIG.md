# Nginx Upload Size Configuration

## Issue
The application is receiving `413 Content Too Large` errors when uploading files. This is because nginx has a default `client_max_body_size` of 1MB.

## Solution
Update the nginx configuration to allow larger file uploads (recommended: 10MB for documents).

### Steps to Fix:

1. SSH into the server
2. Edit the nginx configuration file (usually located at `/etc/nginx/nginx.conf` or `/etc/nginx/sites-available/default`)
3. Add or update the `client_max_body_size` directive in the `http` or `server` block:

```nginx
http {
    # ... other config ...
    client_max_body_size 10M;  # Allow uploads up to 10MB
    # ... rest of config ...
}
```

Or in the server block:

```nginx
server {
    # ... other config ...
    client_max_body_size 10M;  # Allow uploads up to 10MB
    # ... rest of config ...
}
```

4. Test the nginx configuration:
```bash
sudo nginx -t
```

5. Reload nginx:
```bash
sudo systemctl reload nginx
```

### Alternative: Increase to 50MB for larger files
If you need to upload larger files (e.g., high-resolution images, large PDFs), you can increase the limit:

```nginx
client_max_body_size 50M;
```

### Note
The Next.js API routes have been configured with `maxDuration = 60` to allow longer processing times for file uploads. The main bottleneck is the nginx `client_max_body_size` setting.


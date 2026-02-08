# Lightsail instance – SSH connection

For future use when SSH access is needed (e.g. deployment, debugging, logs).

| Field | Value |
|-------|--------|
| **Instance name** | `campus-rentals-custom-2` |
| **Static IP** | `23.21.76.187` |
| **Username** | `bitnami` |
| **Region** | Virginia, us-east-1a |
| **Stack** | Node.js (Bitnami) |
| **SSH key** | Lightsail key uploaded for this instance (Virginia / us-east-1 default key) |

**Connect (from your machine):**
```bash
ssh -i /path/to/your-lightsail-key.pem bitnami@23.21.76.187
```

Or use the “Connect using SSH” button in the Lightsail console (browser).

**Note:** Keep the `.pem` key path and this doc private; do not commit the key to git.

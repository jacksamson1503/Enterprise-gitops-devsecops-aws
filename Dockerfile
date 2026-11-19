# Production Nginx Container for KILN & CLAY E-Commerce Storefront
FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy website files to Nginx web root
COPY . /usr/share/nginx/html/

# Expose HTTP port
EXPOSE 80

# Health check to ensure Nginx is serving
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Start Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]

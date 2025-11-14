# Build the image
docker build -t wyse-browser .

# Run the container
docker run -d -p 13100:13100 --name wyse-browser-service wyse-browser

# Or use docker-compose
docker-compose up -d
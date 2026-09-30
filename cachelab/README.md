# CacheLab

Run:

    cd backend  && mvn spring-boot:run        # http://localhost:8080
    cd frontend && npm install && npm run dev # http://localhost:5173

Dashboard proxies /api to :8080 (including the SSE stream).
Cache capacity: backend/src/main/resources/application.properties (cache.capacity).

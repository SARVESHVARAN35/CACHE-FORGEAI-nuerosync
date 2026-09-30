package com.example.cachelab.service;

import com.example.cachelab.dto.Dtos.SnapshotDto;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@Component
public class SnapshotBroadcaster {
    private final CacheService service;
    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    public SnapshotBroadcaster(CacheService service) { this.service = service; }

    public SseEmitter subscribe() {
        SseEmitter emitter = new SseEmitter(0L);
        emitters.add(emitter);
        Runnable remove = () -> emitters.remove(emitter);
        emitter.onCompletion(remove);
        emitter.onTimeout(remove);
        emitter.onError(e -> remove.run());
        send(emitter, service.snapshot());
        return emitter;
    }

    @Scheduled(fixedRate = 1000)
    public void broadcast() {
        if (emitters.isEmpty()) return;
        SnapshotDto snapshot = service.snapshot();
        for (SseEmitter emitter : emitters) send(emitter, snapshot);
    }

    private synchronized void send(SseEmitter emitter, SnapshotDto snapshot) {
        try {
            emitter.send(SseEmitter.event().name("snapshot").data(snapshot));
        } catch (Exception e) {
            emitters.remove(emitter);
        }
    }
}

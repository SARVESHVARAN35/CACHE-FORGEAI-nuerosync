package com.example.cachelab.controller;

import com.example.cachelab.dto.Dtos.*;
import com.example.cachelab.eviction.PolicyType;
import com.example.cachelab.service.CacheService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/cache")
public class CacheController {
    private final CacheService service;

    public CacheController(CacheService service) { this.service = service; }

    @GetMapping("/entries")
    public List<EntryDto> entries() { return service.entries(); }

    @GetMapping("/stats")
    public StatsDto stats() { return service.stats(); }

    @GetMapping("/snapshot")
    public SnapshotDto snapshot() { return service.snapshot(); }

    @GetMapping("/{key}")
    public GetResponse get(@PathVariable String key) { return service.get(key); }

    @PutMapping("/policy")
    public StatsDto setPolicy(@RequestBody PolicyRequest request) {
        try {
            return service.setPolicy(PolicyType.valueOf(request.policy().trim().toUpperCase()));
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "policy must be LRU, LFU or ADAPTIVE");
        }
    }

    @PutMapping("/{key}")
    public ResponseEntity<Void> put(@PathVariable String key, @RequestBody PutRequest request) {
        service.put(key, request.value(), request.ttlSeconds());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{key}")
    public RemoveResponse remove(@PathVariable String key) {
        return new RemoveResponse(key, service.remove(key));
    }

    @PostMapping("/clear")
    public StatsDto clear(@RequestParam(defaultValue = "false") boolean resetStats) {
        return service.clear(resetStats);
    }

    @PostMapping("/compare")
    public CompareResult compare(@RequestBody WorkloadRequest request) { return service.compare(request); }

    @PostMapping("/simulate")
    public SimulateResponse simulate(@RequestBody WorkloadRequest request) { return service.simulate(request); }

    @PostMapping("/concurrent")
    public ConcurrentResult concurrent(@RequestBody ConcurrentRequest request) { return service.runConcurrentBurst(request); }
}

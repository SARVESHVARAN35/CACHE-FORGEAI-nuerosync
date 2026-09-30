package com.example.cachelab.config;

import com.example.cachelab.cache.CacheImpl;
import com.example.cachelab.eviction.LruPolicy;
import com.example.cachelab.metrics.CacheMetrics;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@EnableScheduling
public class CacheConfig implements WebMvcConfigurer {

    @Bean
    public CacheMetrics cacheMetrics() { return new CacheMetrics(); }

    @Bean
    public CacheImpl<String, String> cache(@Value("${cache.capacity:20}") int capacity, CacheMetrics metrics) {
        return new CacheImpl<String, String>(capacity, new LruPolicy<String>(), metrics);
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOriginPatterns("*")
                .allowedMethods("GET", "PUT", "POST", "DELETE", "OPTIONS", "HEAD", "PATCH")
                .allowedHeaders("*");
    }
}

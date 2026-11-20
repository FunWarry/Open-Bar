package com.bar.gestioncocktail.security;

import com.bar.gestioncocktail.config.CloudRelayProperties;
import com.bar.gestioncocktail.model.AppSettings;
import com.bar.gestioncocktail.service.AppSettingsService;
import com.bar.gestioncocktail.service.relay.CloudRelayAccessService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link TenantHostContextFilter} verifying multi-tenant subdomain extraction,
 * custom domain matching, and HTTP 421 rejection of misdirected tunnel requests.
 */
@ExtendWith(MockitoExtension.class)
class TenantHostContextFilterTest {

    @Mock
    private AppSettingsService appSettingsService;

    @Mock
    private CloudRelayAccessService accessService;

    private TenantHostContextFilter filter;
    private AppSettings settings;

    @BeforeEach
    void setUp() {
        CloudRelayProperties properties = new CloudRelayProperties();
        properties.setBaseDomain("open-bar.eu");
        filter = new TenantHostContextFilter(appSettingsService, accessService, properties, new ObjectMapper());

        settings = new AppSettings();
        settings.setVenueSlug("le-shaker");
        settings.setCustomDomain("commande.monbar.fr");
    }

    @Test
    @DisplayName("extractSubdomainSlug resolves valid subdomain slugs under base domain")
    void extractsSubdomainSlug() {
        assertThat(TenantHostContextFilter.extractSubdomainSlug("le-shaker.open-bar.eu", "open-bar.eu"))
                .isEqualTo("le-shaker");
        assertThat(TenantHostContextFilter.extractSubdomainSlug("a.b.open-bar.eu", "open-bar.eu"))
                .isNull();
        assertThat(TenantHostContextFilter.extractSubdomainSlug("commande.monbar.fr", "open-bar.eu"))
                .isNull();
    }

    @Test
    @DisplayName("allows matching subdomain and custom CNAME domain over tunnel")
    void allowsMatchingSubdomainAndCustomDomain() throws Exception {
        when(appSettingsService.getSettings()).thenReturn(settings);

        MockHttpServletRequest subReq = new MockHttpServletRequest("GET", "/api/public/branding");
        subReq.addHeader(CloudRelayAccessService.HEADER_FORWARDED_HOST, "le-shaker.open-bar.eu");
        when(accessService.isTunnelRequest(subReq)).thenReturn(true);

        MockHttpServletResponse res1 = new MockHttpServletResponse();
        FilterChain chain1 = mock(FilterChain.class);
        filter.doFilter(subReq, res1, chain1);
        verify(chain1).doFilter(subReq, res1);
        assertThat(subReq.getAttribute(TenantHostContextFilter.ATTR_RESOLVED_VENUE_SLUG)).isEqualTo("le-shaker");
    }

    @Test
    @DisplayName("rejects misdirected tunnel host with HTTP 421 TENANT_HOST_MISMATCH")
    void rejectsMisdirectedHostWith421() throws Exception {
        when(appSettingsService.getSettings()).thenReturn(settings);

        MockHttpServletRequest badReq = new MockHttpServletRequest("GET", "/api/public/branding");
        badReq.addHeader(CloudRelayAccessService.HEADER_FORWARDED_HOST, "other-bar.open-bar.eu");
        when(accessService.isTunnelRequest(badReq)).thenReturn(true);

        MockHttpServletResponse res = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(badReq, res, chain);

        assertThat(res.getStatus()).isEqualTo(421);
        assertThat(res.getContentAsString()).contains("TENANT_HOST_MISMATCH");
        verify(chain, never()).doFilter(badReq, res);
    }
}

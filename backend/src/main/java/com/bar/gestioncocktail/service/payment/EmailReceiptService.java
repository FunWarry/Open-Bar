package com.bar.gestioncocktail.service.payment;

import com.bar.gestioncocktail.model.AppSettings;
import com.bar.gestioncocktail.service.AppSettingsService;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.util.Properties;

/**
 * Service handling digital invoice receipt delivery via SMTP email to patrons after mobile settlement.
 * Gracefully logs and skips actual network dispatch if SMTP credentials are unconfigured.
 */
@Service
public class EmailReceiptService {

    private static final Logger log = LoggerFactory.getLogger(EmailReceiptService.class);

    private final AppSettingsService appSettingsService;

    /**
     * Constructor injection.
     *
     * @param appSettingsService Settings service to access establishment SMTP configuration
     */
    public EmailReceiptService(AppSettingsService appSettingsService) {
        this.appSettingsService = appSettingsService;
    }

    /**
     * Sends the PDF receipt document as an email attachment to the specified customer email address.
     *
     * @param recipientEmail Customer destination email
     * @param invoiceNumber Invoice human-readable identifier (e.g. FAC-2026-00042)
     * @param pdfBytes Binary legal invoice PDF content
     * @param establishmentName Commercial name of the establishment
     * @return True if dispatch succeeded or was cleanly simulated, false if error occurred
     */
    public boolean sendReceiptPdf(
            String recipientEmail,
            String invoiceNumber,
            byte[] pdfBytes,
            String establishmentName
    ) {
        if (recipientEmail == null || recipientEmail.isBlank()) {
            return false;
        }

        AppSettings settings = appSettingsService.getSettings();
        String host = settings.getSmtpHost();

        if (host == null || host.isBlank()) {
            log.info("SMTP host not configured. Digital receipt for invoice {} simulated for recipient {}",
                    invoiceNumber, recipientEmail);
            return true;
        }

        try {
            JavaMailSenderImpl mailSender = configureMailSender(settings, host);
            MimeMessage message = buildMimeMessage(mailSender, settings, recipientEmail, invoiceNumber, pdfBytes, establishmentName);
            mailSender.send(message);
            log.info("Digital receipt email sent successfully for invoice {} to {}", invoiceNumber, recipientEmail);
            return true;
        } catch (org.springframework.mail.MailException | jakarta.mail.MessagingException | java.io.UnsupportedEncodingException e) {
            log.error("Failed sending digital receipt email for invoice {} to {}: {}",
                    invoiceNumber, recipientEmail, e.getMessage());
            return false;
        }
    }

    private JavaMailSenderImpl configureMailSender(AppSettings settings, String host) {
        JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
        mailSender.setHost(host);
        mailSender.setPort(settings.getSmtpPort() != null ? settings.getSmtpPort() : 587);

        if (settings.getSmtpUsername() != null && !settings.getSmtpUsername().isBlank()) {
            mailSender.setUsername(settings.getSmtpUsername());
        }
        if (settings.getSmtpPassword() != null && !settings.getSmtpPassword().isBlank()) {
            mailSender.setPassword(settings.getSmtpPassword());
        }

        Properties props = mailSender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", Boolean.TRUE.equals(settings.getSmtpAuth()) ? "true" : "false");
        props.put("mail.smtp.starttls.enable", Boolean.TRUE.equals(settings.getSmtpStarttls()) ? "true" : "false");
        props.put("mail.smtp.connectiontimeout", "5000");
        props.put("mail.smtp.timeout", "5000");

        return mailSender;
    }

    private MimeMessage buildMimeMessage(
            JavaMailSenderImpl mailSender,
            AppSettings settings,
            String recipientEmail,
            String invoiceNumber,
            byte[] pdfBytes,
            String establishmentName
    ) throws jakarta.mail.MessagingException, java.io.UnsupportedEncodingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        String from = (settings.getSmtpFrom() != null && !settings.getSmtpFrom().isBlank())
                ? settings.getSmtpFrom()
                : "no-reply@openbar.local";

        String name = (establishmentName != null && !establishmentName.isBlank())
                ? establishmentName
                : "OpenBar";

        helper.setFrom(from, name);
        helper.setTo(recipientEmail);
        helper.setSubject("Votre reçu de paiement - " + name + " (" + invoiceNumber + ")");

        String htmlBody = "<div style=\"font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;\">" +
                "<h2 style=\"color: #6c7fe8;\">Merci pour votre visite chez " + name + " !</h2>" +
                "<p>Votre paiement à table a été validé avec succès.</p>" +
                "<p>Vous trouverez ci-joint votre reçu et justificatif fiscal en pièce jointe (PDF) pour la facture <strong>" + invoiceNumber + "</strong>.</p>" +
                "<hr style=\"border: none; border-top: 1px solid #eee; margin: 20px 0;\" />" +
                "<p style=\"font-size: 12px; color: #888;\">Cet email vous a été envoyé automatiquement suite à votre règlement par QR code. À bientôt !</p>" +
                "</div>";

        helper.setText(htmlBody, true);
        helper.addAttachment(
                "facture-" + invoiceNumber + ".pdf",
                new ByteArrayResource(pdfBytes),
                "application/pdf"
        );

        return message;
    }
}

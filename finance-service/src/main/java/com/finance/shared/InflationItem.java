package com.finance.shared;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public class InflationItem {

    private String date;
    private Double rate;

    public String date() {
        return date;
    }

    public Double rate() {
        return rate;
    }

    @JsonProperty("Tarih")
    public void setDate(String date) {
        this.date = date;
    }

    @JsonAnySetter
    public void setUnknown(String name, Object value) {
        if (name == null || !name.replace('.', '_').startsWith("TP_FG_J0")) {
            return;
        }
        this.rate = parseRate(value);
    }

    private Double parseRate(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.doubleValue();
        }

        String text = value.toString().trim();
        if (text.isEmpty() || "null".equalsIgnoreCase(text)) {
            return null;
        }
        try {
            return Double.valueOf(text.replace(",", "."));
        } catch (NumberFormatException ignored) {
            return null;
        }
    }
}

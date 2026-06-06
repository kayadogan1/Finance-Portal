package com.finance.shared;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Data transfer object that represents inflation item data.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class InflationItem {

    private String date;
    private Double rate;

    /**
     * Returns the result of date.
     *
     * @return date result
     */
    public String date() {
        return date;
    }

    /**
     * Returns the result of rate.
     *
     * @return rate result
     */
    public Double rate() {
        return rate;
    }

    /**
     * Performs set date.
     *
     * @param date date value
     */
    @JsonProperty("Tarih")
    public void setDate(String date) {
        this.date = date;
    }

    /**
     * Performs set unknown.
     *
     * @param name name value
     * @param value value value
     */
    @JsonAnySetter
    public void setUnknown(String name, Object value) {
        if (name == null || !name.replace('.', '_').startsWith("TP_FG_J0")) {
            return;
        }
        this.rate = parseRate(value);
    }

    /**
     * Returns the result of parse rate.
     *
     * @param value value value
     * @return parse rate result
     */
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

package com.finance.shared;


public enum TimeSlot {
    M1(1,      "1m",   "1 Dakika"),
    M5(5,      "5m",   "5 Dakika"),
    M15(15,    "15m",  "15 Dakika"),
    M30(30,    "30m",  "30 Dakika"),
    H1(60,     "1h",   "1 Saat"),
    H4(240,    "4h",   "4 Saat"),
    D1(1440,   "1d",   "1 Gün"),
    W1(10080,  "1wk",  "1 Hafta"),
    MO1(43200, "1mo",  "1 Ay"),
    MO6(259200,"6mo",  "6 Ay"),
    Y1(525600, "12mo", "12 Ay");


    private final int minutes;

    private final String code;

    private final String label;

    TimeSlot(int minutes, String code, String label) {
        this.minutes = minutes;
        this.code = code;
        this.label = label;
    }

    public int getMinutes() {
        return minutes;
    }

    public String getCode() {
        return code;
    }

    public String getLabel() {
        return label;
    }

    public static TimeSlot fromCode(String code) {
        for (TimeSlot r : values()) {
            if (r.code.equalsIgnoreCase(code)) {
                return r;
            }
        }
        throw new IllegalArgumentException("Geçersiz periyot: " + code);
    }
}
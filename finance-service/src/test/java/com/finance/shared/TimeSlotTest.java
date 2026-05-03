package com.finance.shared;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class TimeSlotTest {

    @Test
    void fromCode_whenValid_returnsMatchingEnum() {
        assertEquals(TimeSlot.M1, TimeSlot.fromCode("1m"));
        assertEquals(TimeSlot.H1, TimeSlot.fromCode("1H"));
        assertEquals(TimeSlot.W1, TimeSlot.fromCode("1wk"));
    }

    @Test
    void fromCode_whenInvalid_throwsException() {
        assertThrows(IllegalArgumentException.class, () -> TimeSlot.fromCode("bad"));
    }

    @Test
    void getters_returnConfiguredValues() {
        assertEquals(1440, TimeSlot.D1.getMinutes());
        assertEquals("1d", TimeSlot.D1.getCode());
        assertEquals("1 Gün", TimeSlot.D1.getLabel());
    }
}

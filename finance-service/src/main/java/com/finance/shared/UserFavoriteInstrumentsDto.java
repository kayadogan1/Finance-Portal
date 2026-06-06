package com.finance.shared;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/**
 * Data transfer object that represents user favorite instruments data.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UserFavoriteInstrumentsDto {
    private UUID id;
    private String userId;
    private InstrumentDto instrument;

}

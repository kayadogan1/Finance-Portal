package com.finance.exceptions;

public class InstrumentNotFoundException extends RuntimeException {
  public InstrumentNotFoundException(String message) {
    super(message);
  }
}

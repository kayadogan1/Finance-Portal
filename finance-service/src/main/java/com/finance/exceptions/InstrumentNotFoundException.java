package com.finance.exceptions;

/**
 * Runtime exception used for instrument not found error cases.
 */
public class InstrumentNotFoundException extends RuntimeException {
  /**
   * Creates a new InstrumentNotFoundException with its required dependencies.
   *
   * @param message message value
   */
  public InstrumentNotFoundException(String message) {
    super(message);
  }
}

package com.finguard.dto;

import jakarta.validation.constraints.Size;

public record ReviewAlertRequest(@Size(max = 250) String note) {}

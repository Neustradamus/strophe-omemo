# CMAKE generated file: DO NOT EDIT!
# Generated by "Unix Makefiles" Generator, CMake Version 3.5

# Delete rule output on recipe failure.
.DELETE_ON_ERROR:


#=============================================================================
# Special targets provided by cmake.

# Disable implicit rules so canonical targets will work.
.SUFFIXES:


# Remove some rules from gmake that .SUFFIXES does not remove.
SUFFIXES =

.SUFFIXES: .hpux_make_needs_suffix_list


# Suppress display of executed commands.
$(VERBOSE).SILENT:


# A target that is always out of date.
cmake_force:

.PHONY : cmake_force

#=============================================================================
# Set environment variables for the build.

# The shell in which to execute make rules.
SHELL = /bin/sh

# The CMake executable.
CMAKE_COMMAND = /usr/bin/cmake

# The command to remove a file.
RM = /usr/bin/cmake -E remove -f

# Escaping for special characters.
EQUALS = =

# The top-level source directory on which CMake was run.
CMAKE_SOURCE_DIR = /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src

# The top-level build directory on which CMake was run.
CMAKE_BINARY_DIR = /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64

# Utility rule file for intrinsics_gen.

# Include the progress variables for this target.
include include/llvm/IR/CMakeFiles/intrinsics_gen.dir/progress.make

include/llvm/IR/CMakeFiles/intrinsics_gen: include/llvm/IR/Attributes.gen
include/llvm/IR/CMakeFiles/intrinsics_gen: include/llvm/IR/Intrinsics.gen


include/llvm/IR/Attributes.gen: include/llvm/IR/Attributes.gen.tmp
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --blue --bold --progress-dir=/var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/CMakeFiles --progress-num=$(CMAKE_PROGRESS_1) "Updating Attributes.gen..."
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/include/llvm/IR && /usr/bin/cmake -E copy_if_different /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/include/llvm/IR/Attributes.gen.tmp /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/include/llvm/IR/Attributes.gen

include/llvm/IR/Intrinsics.gen: include/llvm/IR/Intrinsics.gen.tmp
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --blue --bold --progress-dir=/var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/CMakeFiles --progress-num=$(CMAKE_PROGRESS_2) "Updating Intrinsics.gen..."
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/include/llvm/IR && /usr/bin/cmake -E copy_if_different /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/include/llvm/IR/Intrinsics.gen.tmp /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/include/llvm/IR/Intrinsics.gen

include/llvm/IR/Attributes.gen.tmp: bin/llvm-tblgen
include/llvm/IR/Attributes.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsAMDGPU.td
include/llvm/IR/Attributes.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsBPF.td
include/llvm/IR/Attributes.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsSystemZ.td
include/llvm/IR/Attributes.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsNVVM.td
include/llvm/IR/Attributes.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/Intrinsics.td
include/llvm/IR/Attributes.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/Attributes.td
include/llvm/IR/Attributes.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsX86.td
include/llvm/IR/Attributes.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsHexagon.td
include/llvm/IR/Attributes.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsXCore.td
include/llvm/IR/Attributes.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsARM.td
include/llvm/IR/Attributes.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsAArch64.td
include/llvm/IR/Attributes.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsMips.td
include/llvm/IR/Attributes.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsPowerPC.td
include/llvm/IR/Attributes.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsWebAssembly.td
include/llvm/IR/Attributes.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/CodeGen/ValueTypes.td
include/llvm/IR/Attributes.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/TableGen/SearchableTable.td
include/llvm/IR/Attributes.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsAMDGPU.td
include/llvm/IR/Attributes.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsBPF.td
include/llvm/IR/Attributes.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsSystemZ.td
include/llvm/IR/Attributes.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsNVVM.td
include/llvm/IR/Attributes.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/Intrinsics.td
include/llvm/IR/Attributes.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/Attributes.td
include/llvm/IR/Attributes.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsX86.td
include/llvm/IR/Attributes.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsHexagon.td
include/llvm/IR/Attributes.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsXCore.td
include/llvm/IR/Attributes.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsARM.td
include/llvm/IR/Attributes.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsAArch64.td
include/llvm/IR/Attributes.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsMips.td
include/llvm/IR/Attributes.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsPowerPC.td
include/llvm/IR/Attributes.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsWebAssembly.td
include/llvm/IR/Attributes.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/Option/OptParser.td
include/llvm/IR/Attributes.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/Target/TargetCallingConv.td
include/llvm/IR/Attributes.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/Target/TargetItinerary.td
include/llvm/IR/Attributes.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/Target/Target.td
include/llvm/IR/Attributes.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/Target/GenericOpcodes.td
include/llvm/IR/Attributes.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/Target/TargetSelectionDAG.td
include/llvm/IR/Attributes.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/Target/TargetGlobalISel.td
include/llvm/IR/Attributes.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/Target/TargetSchedule.td
include/llvm/IR/Attributes.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/Attributes.td
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --blue --bold --progress-dir=/var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/CMakeFiles --progress-num=$(CMAKE_PROGRESS_3) "Building Attributes.gen..."
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/include/llvm/IR && ../../../bin/llvm-tblgen -gen-attrs -I /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR -I /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/Attributes.td -o /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/include/llvm/IR/Attributes.gen.tmp

include/llvm/IR/Intrinsics.gen.tmp: bin/llvm-tblgen
include/llvm/IR/Intrinsics.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsAMDGPU.td
include/llvm/IR/Intrinsics.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsBPF.td
include/llvm/IR/Intrinsics.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsSystemZ.td
include/llvm/IR/Intrinsics.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsNVVM.td
include/llvm/IR/Intrinsics.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/Intrinsics.td
include/llvm/IR/Intrinsics.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/Attributes.td
include/llvm/IR/Intrinsics.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsX86.td
include/llvm/IR/Intrinsics.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsHexagon.td
include/llvm/IR/Intrinsics.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsXCore.td
include/llvm/IR/Intrinsics.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsARM.td
include/llvm/IR/Intrinsics.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsAArch64.td
include/llvm/IR/Intrinsics.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsMips.td
include/llvm/IR/Intrinsics.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsPowerPC.td
include/llvm/IR/Intrinsics.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsWebAssembly.td
include/llvm/IR/Intrinsics.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/CodeGen/ValueTypes.td
include/llvm/IR/Intrinsics.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/TableGen/SearchableTable.td
include/llvm/IR/Intrinsics.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsAMDGPU.td
include/llvm/IR/Intrinsics.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsBPF.td
include/llvm/IR/Intrinsics.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsSystemZ.td
include/llvm/IR/Intrinsics.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsNVVM.td
include/llvm/IR/Intrinsics.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/Intrinsics.td
include/llvm/IR/Intrinsics.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/Attributes.td
include/llvm/IR/Intrinsics.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsX86.td
include/llvm/IR/Intrinsics.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsHexagon.td
include/llvm/IR/Intrinsics.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsXCore.td
include/llvm/IR/Intrinsics.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsARM.td
include/llvm/IR/Intrinsics.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsAArch64.td
include/llvm/IR/Intrinsics.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsMips.td
include/llvm/IR/Intrinsics.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsPowerPC.td
include/llvm/IR/Intrinsics.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/IntrinsicsWebAssembly.td
include/llvm/IR/Intrinsics.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/Option/OptParser.td
include/llvm/IR/Intrinsics.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/Target/TargetCallingConv.td
include/llvm/IR/Intrinsics.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/Target/TargetItinerary.td
include/llvm/IR/Intrinsics.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/Target/Target.td
include/llvm/IR/Intrinsics.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/Target/GenericOpcodes.td
include/llvm/IR/Intrinsics.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/Target/TargetSelectionDAG.td
include/llvm/IR/Intrinsics.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/Target/TargetGlobalISel.td
include/llvm/IR/Intrinsics.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/Target/TargetSchedule.td
include/llvm/IR/Intrinsics.gen.tmp: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/Intrinsics.td
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --blue --bold --progress-dir=/var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/CMakeFiles --progress-num=$(CMAKE_PROGRESS_4) "Building Intrinsics.gen..."
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/include/llvm/IR && ../../../bin/llvm-tblgen -gen-intrinsic -I /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR -I /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR/Intrinsics.td -o /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/include/llvm/IR/Intrinsics.gen.tmp

intrinsics_gen: include/llvm/IR/CMakeFiles/intrinsics_gen
intrinsics_gen: include/llvm/IR/Attributes.gen
intrinsics_gen: include/llvm/IR/Intrinsics.gen
intrinsics_gen: include/llvm/IR/Attributes.gen.tmp
intrinsics_gen: include/llvm/IR/Intrinsics.gen.tmp
intrinsics_gen: include/llvm/IR/CMakeFiles/intrinsics_gen.dir/build.make

.PHONY : intrinsics_gen

# Rule to build all files generated by this target.
include/llvm/IR/CMakeFiles/intrinsics_gen.dir/build: intrinsics_gen

.PHONY : include/llvm/IR/CMakeFiles/intrinsics_gen.dir/build

include/llvm/IR/CMakeFiles/intrinsics_gen.dir/clean:
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/include/llvm/IR && $(CMAKE_COMMAND) -P CMakeFiles/intrinsics_gen.dir/cmake_clean.cmake
.PHONY : include/llvm/IR/CMakeFiles/intrinsics_gen.dir/clean

include/llvm/IR/CMakeFiles/intrinsics_gen.dir/depend:
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64 && $(CMAKE_COMMAND) -E cmake_depends "Unix Makefiles" /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/include/llvm/IR /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64 /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/include/llvm/IR /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/include/llvm/IR/CMakeFiles/intrinsics_gen.dir/DependInfo.cmake --color=$(COLOR)
.PHONY : include/llvm/IR/CMakeFiles/intrinsics_gen.dir/depend


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

# Include any dependencies generated for this target.
include tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/depend.make

# Include the progress variables for this target.
include tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/progress.make

# Include the compile flags for this target's objects.
include tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/flags.make

tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ARMAttributeParser.cpp.o: tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/flags.make
tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ARMAttributeParser.cpp.o: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/llvm-readobj/ARMAttributeParser.cpp
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green --progress-dir=/var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/CMakeFiles --progress-num=$(CMAKE_PROGRESS_1) "Building CXX object tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ARMAttributeParser.cpp.o"
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/tools/llvm-readobj && /usr/bin/c++   $(CXX_DEFINES) $(CXX_INCLUDES) $(CXX_FLAGS) -o CMakeFiles/llvm-readobj.dir/ARMAttributeParser.cpp.o -c /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/llvm-readobj/ARMAttributeParser.cpp

tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ARMAttributeParser.cpp.i: cmake_force
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green "Preprocessing CXX source to CMakeFiles/llvm-readobj.dir/ARMAttributeParser.cpp.i"
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/tools/llvm-readobj && /usr/bin/c++  $(CXX_DEFINES) $(CXX_INCLUDES) $(CXX_FLAGS) -E /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/llvm-readobj/ARMAttributeParser.cpp > CMakeFiles/llvm-readobj.dir/ARMAttributeParser.cpp.i

tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ARMAttributeParser.cpp.s: cmake_force
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green "Compiling CXX source to assembly CMakeFiles/llvm-readobj.dir/ARMAttributeParser.cpp.s"
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/tools/llvm-readobj && /usr/bin/c++  $(CXX_DEFINES) $(CXX_INCLUDES) $(CXX_FLAGS) -S /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/llvm-readobj/ARMAttributeParser.cpp -o CMakeFiles/llvm-readobj.dir/ARMAttributeParser.cpp.s

tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ARMAttributeParser.cpp.o.requires:

.PHONY : tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ARMAttributeParser.cpp.o.requires

tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ARMAttributeParser.cpp.o.provides: tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ARMAttributeParser.cpp.o.requires
	$(MAKE) -f tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/build.make tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ARMAttributeParser.cpp.o.provides.build
.PHONY : tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ARMAttributeParser.cpp.o.provides

tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ARMAttributeParser.cpp.o.provides.build: tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ARMAttributeParser.cpp.o


tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ARMWinEHPrinter.cpp.o: tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/flags.make
tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ARMWinEHPrinter.cpp.o: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/llvm-readobj/ARMWinEHPrinter.cpp
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green --progress-dir=/var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/CMakeFiles --progress-num=$(CMAKE_PROGRESS_2) "Building CXX object tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ARMWinEHPrinter.cpp.o"
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/tools/llvm-readobj && /usr/bin/c++   $(CXX_DEFINES) $(CXX_INCLUDES) $(CXX_FLAGS) -o CMakeFiles/llvm-readobj.dir/ARMWinEHPrinter.cpp.o -c /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/llvm-readobj/ARMWinEHPrinter.cpp

tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ARMWinEHPrinter.cpp.i: cmake_force
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green "Preprocessing CXX source to CMakeFiles/llvm-readobj.dir/ARMWinEHPrinter.cpp.i"
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/tools/llvm-readobj && /usr/bin/c++  $(CXX_DEFINES) $(CXX_INCLUDES) $(CXX_FLAGS) -E /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/llvm-readobj/ARMWinEHPrinter.cpp > CMakeFiles/llvm-readobj.dir/ARMWinEHPrinter.cpp.i

tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ARMWinEHPrinter.cpp.s: cmake_force
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green "Compiling CXX source to assembly CMakeFiles/llvm-readobj.dir/ARMWinEHPrinter.cpp.s"
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/tools/llvm-readobj && /usr/bin/c++  $(CXX_DEFINES) $(CXX_INCLUDES) $(CXX_FLAGS) -S /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/llvm-readobj/ARMWinEHPrinter.cpp -o CMakeFiles/llvm-readobj.dir/ARMWinEHPrinter.cpp.s

tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ARMWinEHPrinter.cpp.o.requires:

.PHONY : tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ARMWinEHPrinter.cpp.o.requires

tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ARMWinEHPrinter.cpp.o.provides: tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ARMWinEHPrinter.cpp.o.requires
	$(MAKE) -f tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/build.make tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ARMWinEHPrinter.cpp.o.provides.build
.PHONY : tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ARMWinEHPrinter.cpp.o.provides

tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ARMWinEHPrinter.cpp.o.provides.build: tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ARMWinEHPrinter.cpp.o


tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/COFFDumper.cpp.o: tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/flags.make
tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/COFFDumper.cpp.o: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/llvm-readobj/COFFDumper.cpp
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green --progress-dir=/var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/CMakeFiles --progress-num=$(CMAKE_PROGRESS_3) "Building CXX object tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/COFFDumper.cpp.o"
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/tools/llvm-readobj && /usr/bin/c++   $(CXX_DEFINES) $(CXX_INCLUDES) $(CXX_FLAGS) -o CMakeFiles/llvm-readobj.dir/COFFDumper.cpp.o -c /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/llvm-readobj/COFFDumper.cpp

tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/COFFDumper.cpp.i: cmake_force
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green "Preprocessing CXX source to CMakeFiles/llvm-readobj.dir/COFFDumper.cpp.i"
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/tools/llvm-readobj && /usr/bin/c++  $(CXX_DEFINES) $(CXX_INCLUDES) $(CXX_FLAGS) -E /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/llvm-readobj/COFFDumper.cpp > CMakeFiles/llvm-readobj.dir/COFFDumper.cpp.i

tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/COFFDumper.cpp.s: cmake_force
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green "Compiling CXX source to assembly CMakeFiles/llvm-readobj.dir/COFFDumper.cpp.s"
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/tools/llvm-readobj && /usr/bin/c++  $(CXX_DEFINES) $(CXX_INCLUDES) $(CXX_FLAGS) -S /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/llvm-readobj/COFFDumper.cpp -o CMakeFiles/llvm-readobj.dir/COFFDumper.cpp.s

tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/COFFDumper.cpp.o.requires:

.PHONY : tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/COFFDumper.cpp.o.requires

tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/COFFDumper.cpp.o.provides: tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/COFFDumper.cpp.o.requires
	$(MAKE) -f tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/build.make tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/COFFDumper.cpp.o.provides.build
.PHONY : tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/COFFDumper.cpp.o.provides

tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/COFFDumper.cpp.o.provides.build: tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/COFFDumper.cpp.o


tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/COFFImportDumper.cpp.o: tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/flags.make
tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/COFFImportDumper.cpp.o: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/llvm-readobj/COFFImportDumper.cpp
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green --progress-dir=/var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/CMakeFiles --progress-num=$(CMAKE_PROGRESS_4) "Building CXX object tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/COFFImportDumper.cpp.o"
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/tools/llvm-readobj && /usr/bin/c++   $(CXX_DEFINES) $(CXX_INCLUDES) $(CXX_FLAGS) -o CMakeFiles/llvm-readobj.dir/COFFImportDumper.cpp.o -c /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/llvm-readobj/COFFImportDumper.cpp

tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/COFFImportDumper.cpp.i: cmake_force
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green "Preprocessing CXX source to CMakeFiles/llvm-readobj.dir/COFFImportDumper.cpp.i"
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/tools/llvm-readobj && /usr/bin/c++  $(CXX_DEFINES) $(CXX_INCLUDES) $(CXX_FLAGS) -E /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/llvm-readobj/COFFImportDumper.cpp > CMakeFiles/llvm-readobj.dir/COFFImportDumper.cpp.i

tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/COFFImportDumper.cpp.s: cmake_force
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green "Compiling CXX source to assembly CMakeFiles/llvm-readobj.dir/COFFImportDumper.cpp.s"
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/tools/llvm-readobj && /usr/bin/c++  $(CXX_DEFINES) $(CXX_INCLUDES) $(CXX_FLAGS) -S /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/llvm-readobj/COFFImportDumper.cpp -o CMakeFiles/llvm-readobj.dir/COFFImportDumper.cpp.s

tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/COFFImportDumper.cpp.o.requires:

.PHONY : tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/COFFImportDumper.cpp.o.requires

tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/COFFImportDumper.cpp.o.provides: tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/COFFImportDumper.cpp.o.requires
	$(MAKE) -f tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/build.make tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/COFFImportDumper.cpp.o.provides.build
.PHONY : tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/COFFImportDumper.cpp.o.provides

tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/COFFImportDumper.cpp.o.provides.build: tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/COFFImportDumper.cpp.o


tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ELFDumper.cpp.o: tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/flags.make
tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ELFDumper.cpp.o: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/llvm-readobj/ELFDumper.cpp
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green --progress-dir=/var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/CMakeFiles --progress-num=$(CMAKE_PROGRESS_5) "Building CXX object tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ELFDumper.cpp.o"
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/tools/llvm-readobj && /usr/bin/c++   $(CXX_DEFINES) $(CXX_INCLUDES) $(CXX_FLAGS) -o CMakeFiles/llvm-readobj.dir/ELFDumper.cpp.o -c /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/llvm-readobj/ELFDumper.cpp

tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ELFDumper.cpp.i: cmake_force
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green "Preprocessing CXX source to CMakeFiles/llvm-readobj.dir/ELFDumper.cpp.i"
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/tools/llvm-readobj && /usr/bin/c++  $(CXX_DEFINES) $(CXX_INCLUDES) $(CXX_FLAGS) -E /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/llvm-readobj/ELFDumper.cpp > CMakeFiles/llvm-readobj.dir/ELFDumper.cpp.i

tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ELFDumper.cpp.s: cmake_force
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green "Compiling CXX source to assembly CMakeFiles/llvm-readobj.dir/ELFDumper.cpp.s"
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/tools/llvm-readobj && /usr/bin/c++  $(CXX_DEFINES) $(CXX_INCLUDES) $(CXX_FLAGS) -S /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/llvm-readobj/ELFDumper.cpp -o CMakeFiles/llvm-readobj.dir/ELFDumper.cpp.s

tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ELFDumper.cpp.o.requires:

.PHONY : tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ELFDumper.cpp.o.requires

tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ELFDumper.cpp.o.provides: tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ELFDumper.cpp.o.requires
	$(MAKE) -f tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/build.make tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ELFDumper.cpp.o.provides.build
.PHONY : tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ELFDumper.cpp.o.provides

tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ELFDumper.cpp.o.provides.build: tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ELFDumper.cpp.o


tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/Error.cpp.o: tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/flags.make
tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/Error.cpp.o: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/llvm-readobj/Error.cpp
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green --progress-dir=/var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/CMakeFiles --progress-num=$(CMAKE_PROGRESS_6) "Building CXX object tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/Error.cpp.o"
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/tools/llvm-readobj && /usr/bin/c++   $(CXX_DEFINES) $(CXX_INCLUDES) $(CXX_FLAGS) -o CMakeFiles/llvm-readobj.dir/Error.cpp.o -c /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/llvm-readobj/Error.cpp

tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/Error.cpp.i: cmake_force
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green "Preprocessing CXX source to CMakeFiles/llvm-readobj.dir/Error.cpp.i"
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/tools/llvm-readobj && /usr/bin/c++  $(CXX_DEFINES) $(CXX_INCLUDES) $(CXX_FLAGS) -E /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/llvm-readobj/Error.cpp > CMakeFiles/llvm-readobj.dir/Error.cpp.i

tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/Error.cpp.s: cmake_force
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green "Compiling CXX source to assembly CMakeFiles/llvm-readobj.dir/Error.cpp.s"
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/tools/llvm-readobj && /usr/bin/c++  $(CXX_DEFINES) $(CXX_INCLUDES) $(CXX_FLAGS) -S /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/llvm-readobj/Error.cpp -o CMakeFiles/llvm-readobj.dir/Error.cpp.s

tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/Error.cpp.o.requires:

.PHONY : tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/Error.cpp.o.requires

tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/Error.cpp.o.provides: tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/Error.cpp.o.requires
	$(MAKE) -f tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/build.make tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/Error.cpp.o.provides.build
.PHONY : tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/Error.cpp.o.provides

tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/Error.cpp.o.provides.build: tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/Error.cpp.o


tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/llvm-readobj.cpp.o: tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/flags.make
tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/llvm-readobj.cpp.o: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/llvm-readobj/llvm-readobj.cpp
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green --progress-dir=/var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/CMakeFiles --progress-num=$(CMAKE_PROGRESS_7) "Building CXX object tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/llvm-readobj.cpp.o"
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/tools/llvm-readobj && /usr/bin/c++   $(CXX_DEFINES) $(CXX_INCLUDES) $(CXX_FLAGS) -o CMakeFiles/llvm-readobj.dir/llvm-readobj.cpp.o -c /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/llvm-readobj/llvm-readobj.cpp

tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/llvm-readobj.cpp.i: cmake_force
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green "Preprocessing CXX source to CMakeFiles/llvm-readobj.dir/llvm-readobj.cpp.i"
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/tools/llvm-readobj && /usr/bin/c++  $(CXX_DEFINES) $(CXX_INCLUDES) $(CXX_FLAGS) -E /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/llvm-readobj/llvm-readobj.cpp > CMakeFiles/llvm-readobj.dir/llvm-readobj.cpp.i

tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/llvm-readobj.cpp.s: cmake_force
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green "Compiling CXX source to assembly CMakeFiles/llvm-readobj.dir/llvm-readobj.cpp.s"
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/tools/llvm-readobj && /usr/bin/c++  $(CXX_DEFINES) $(CXX_INCLUDES) $(CXX_FLAGS) -S /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/llvm-readobj/llvm-readobj.cpp -o CMakeFiles/llvm-readobj.dir/llvm-readobj.cpp.s

tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/llvm-readobj.cpp.o.requires:

.PHONY : tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/llvm-readobj.cpp.o.requires

tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/llvm-readobj.cpp.o.provides: tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/llvm-readobj.cpp.o.requires
	$(MAKE) -f tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/build.make tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/llvm-readobj.cpp.o.provides.build
.PHONY : tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/llvm-readobj.cpp.o.provides

tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/llvm-readobj.cpp.o.provides.build: tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/llvm-readobj.cpp.o


tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/MachODumper.cpp.o: tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/flags.make
tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/MachODumper.cpp.o: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/llvm-readobj/MachODumper.cpp
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green --progress-dir=/var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/CMakeFiles --progress-num=$(CMAKE_PROGRESS_8) "Building CXX object tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/MachODumper.cpp.o"
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/tools/llvm-readobj && /usr/bin/c++   $(CXX_DEFINES) $(CXX_INCLUDES) $(CXX_FLAGS) -o CMakeFiles/llvm-readobj.dir/MachODumper.cpp.o -c /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/llvm-readobj/MachODumper.cpp

tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/MachODumper.cpp.i: cmake_force
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green "Preprocessing CXX source to CMakeFiles/llvm-readobj.dir/MachODumper.cpp.i"
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/tools/llvm-readobj && /usr/bin/c++  $(CXX_DEFINES) $(CXX_INCLUDES) $(CXX_FLAGS) -E /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/llvm-readobj/MachODumper.cpp > CMakeFiles/llvm-readobj.dir/MachODumper.cpp.i

tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/MachODumper.cpp.s: cmake_force
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green "Compiling CXX source to assembly CMakeFiles/llvm-readobj.dir/MachODumper.cpp.s"
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/tools/llvm-readobj && /usr/bin/c++  $(CXX_DEFINES) $(CXX_INCLUDES) $(CXX_FLAGS) -S /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/llvm-readobj/MachODumper.cpp -o CMakeFiles/llvm-readobj.dir/MachODumper.cpp.s

tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/MachODumper.cpp.o.requires:

.PHONY : tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/MachODumper.cpp.o.requires

tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/MachODumper.cpp.o.provides: tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/MachODumper.cpp.o.requires
	$(MAKE) -f tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/build.make tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/MachODumper.cpp.o.provides.build
.PHONY : tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/MachODumper.cpp.o.provides

tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/MachODumper.cpp.o.provides.build: tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/MachODumper.cpp.o


tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ObjDumper.cpp.o: tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/flags.make
tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ObjDumper.cpp.o: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/llvm-readobj/ObjDumper.cpp
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green --progress-dir=/var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/CMakeFiles --progress-num=$(CMAKE_PROGRESS_9) "Building CXX object tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ObjDumper.cpp.o"
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/tools/llvm-readobj && /usr/bin/c++   $(CXX_DEFINES) $(CXX_INCLUDES) $(CXX_FLAGS) -o CMakeFiles/llvm-readobj.dir/ObjDumper.cpp.o -c /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/llvm-readobj/ObjDumper.cpp

tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ObjDumper.cpp.i: cmake_force
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green "Preprocessing CXX source to CMakeFiles/llvm-readobj.dir/ObjDumper.cpp.i"
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/tools/llvm-readobj && /usr/bin/c++  $(CXX_DEFINES) $(CXX_INCLUDES) $(CXX_FLAGS) -E /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/llvm-readobj/ObjDumper.cpp > CMakeFiles/llvm-readobj.dir/ObjDumper.cpp.i

tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ObjDumper.cpp.s: cmake_force
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green "Compiling CXX source to assembly CMakeFiles/llvm-readobj.dir/ObjDumper.cpp.s"
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/tools/llvm-readobj && /usr/bin/c++  $(CXX_DEFINES) $(CXX_INCLUDES) $(CXX_FLAGS) -S /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/llvm-readobj/ObjDumper.cpp -o CMakeFiles/llvm-readobj.dir/ObjDumper.cpp.s

tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ObjDumper.cpp.o.requires:

.PHONY : tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ObjDumper.cpp.o.requires

tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ObjDumper.cpp.o.provides: tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ObjDumper.cpp.o.requires
	$(MAKE) -f tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/build.make tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ObjDumper.cpp.o.provides.build
.PHONY : tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ObjDumper.cpp.o.provides

tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ObjDumper.cpp.o.provides.build: tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ObjDumper.cpp.o


tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/Win64EHDumper.cpp.o: tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/flags.make
tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/Win64EHDumper.cpp.o: /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/llvm-readobj/Win64EHDumper.cpp
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green --progress-dir=/var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/CMakeFiles --progress-num=$(CMAKE_PROGRESS_10) "Building CXX object tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/Win64EHDumper.cpp.o"
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/tools/llvm-readobj && /usr/bin/c++   $(CXX_DEFINES) $(CXX_INCLUDES) $(CXX_FLAGS) -o CMakeFiles/llvm-readobj.dir/Win64EHDumper.cpp.o -c /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/llvm-readobj/Win64EHDumper.cpp

tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/Win64EHDumper.cpp.i: cmake_force
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green "Preprocessing CXX source to CMakeFiles/llvm-readobj.dir/Win64EHDumper.cpp.i"
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/tools/llvm-readobj && /usr/bin/c++  $(CXX_DEFINES) $(CXX_INCLUDES) $(CXX_FLAGS) -E /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/llvm-readobj/Win64EHDumper.cpp > CMakeFiles/llvm-readobj.dir/Win64EHDumper.cpp.i

tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/Win64EHDumper.cpp.s: cmake_force
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green "Compiling CXX source to assembly CMakeFiles/llvm-readobj.dir/Win64EHDumper.cpp.s"
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/tools/llvm-readobj && /usr/bin/c++  $(CXX_DEFINES) $(CXX_INCLUDES) $(CXX_FLAGS) -S /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/llvm-readobj/Win64EHDumper.cpp -o CMakeFiles/llvm-readobj.dir/Win64EHDumper.cpp.s

tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/Win64EHDumper.cpp.o.requires:

.PHONY : tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/Win64EHDumper.cpp.o.requires

tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/Win64EHDumper.cpp.o.provides: tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/Win64EHDumper.cpp.o.requires
	$(MAKE) -f tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/build.make tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/Win64EHDumper.cpp.o.provides.build
.PHONY : tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/Win64EHDumper.cpp.o.provides

tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/Win64EHDumper.cpp.o.provides.build: tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/Win64EHDumper.cpp.o


# Object files for target llvm-readobj
llvm__readobj_OBJECTS = \
"CMakeFiles/llvm-readobj.dir/ARMAttributeParser.cpp.o" \
"CMakeFiles/llvm-readobj.dir/ARMWinEHPrinter.cpp.o" \
"CMakeFiles/llvm-readobj.dir/COFFDumper.cpp.o" \
"CMakeFiles/llvm-readobj.dir/COFFImportDumper.cpp.o" \
"CMakeFiles/llvm-readobj.dir/ELFDumper.cpp.o" \
"CMakeFiles/llvm-readobj.dir/Error.cpp.o" \
"CMakeFiles/llvm-readobj.dir/llvm-readobj.cpp.o" \
"CMakeFiles/llvm-readobj.dir/MachODumper.cpp.o" \
"CMakeFiles/llvm-readobj.dir/ObjDumper.cpp.o" \
"CMakeFiles/llvm-readobj.dir/Win64EHDumper.cpp.o"

# External object files for target llvm-readobj
llvm__readobj_EXTERNAL_OBJECTS =

bin/llvm-readobj: tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ARMAttributeParser.cpp.o
bin/llvm-readobj: tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ARMWinEHPrinter.cpp.o
bin/llvm-readobj: tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/COFFDumper.cpp.o
bin/llvm-readobj: tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/COFFImportDumper.cpp.o
bin/llvm-readobj: tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ELFDumper.cpp.o
bin/llvm-readobj: tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/Error.cpp.o
bin/llvm-readobj: tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/llvm-readobj.cpp.o
bin/llvm-readobj: tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/MachODumper.cpp.o
bin/llvm-readobj: tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ObjDumper.cpp.o
bin/llvm-readobj: tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/Win64EHDumper.cpp.o
bin/llvm-readobj: tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/build.make
bin/llvm-readobj: lib/libLLVMDebugInfoCodeView.a
bin/llvm-readobj: lib/libLLVMObject.a
bin/llvm-readobj: lib/libLLVMSupport.a
bin/llvm-readobj: lib/libLLVMDebugInfoCodeView.a
bin/llvm-readobj: lib/libLLVMDebugInfoMSF.a
bin/llvm-readobj: lib/libLLVMBitReader.a
bin/llvm-readobj: lib/libLLVMCore.a
bin/llvm-readobj: lib/libLLVMMCParser.a
bin/llvm-readobj: lib/libLLVMMC.a
bin/llvm-readobj: lib/libLLVMSupport.a
bin/llvm-readobj: lib/libLLVMDemangle.a
bin/llvm-readobj: tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/link.txt
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green --bold --progress-dir=/var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/CMakeFiles --progress-num=$(CMAKE_PROGRESS_11) "Linking CXX executable ../../bin/llvm-readobj"
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/tools/llvm-readobj && $(CMAKE_COMMAND) -E cmake_link_script CMakeFiles/llvm-readobj.dir/link.txt --verbose=$(VERBOSE)

# Rule to build all files generated by this target.
tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/build: bin/llvm-readobj

.PHONY : tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/build

tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/requires: tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ARMAttributeParser.cpp.o.requires
tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/requires: tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ARMWinEHPrinter.cpp.o.requires
tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/requires: tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/COFFDumper.cpp.o.requires
tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/requires: tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/COFFImportDumper.cpp.o.requires
tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/requires: tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ELFDumper.cpp.o.requires
tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/requires: tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/Error.cpp.o.requires
tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/requires: tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/llvm-readobj.cpp.o.requires
tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/requires: tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/MachODumper.cpp.o.requires
tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/requires: tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/ObjDumper.cpp.o.requires
tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/requires: tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/Win64EHDumper.cpp.o.requires

.PHONY : tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/requires

tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/clean:
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/tools/llvm-readobj && $(CMAKE_COMMAND) -P CMakeFiles/llvm-readobj.dir/cmake_clean.cmake
.PHONY : tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/clean

tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/depend:
	cd /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64 && $(CMAKE_COMMAND) -E cmake_depends "Unix Makefiles" /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/src/tools/llvm-readobj /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64 /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/tools/llvm-readobj /var/www/development/omemo/files/emsdk-portable/clang/tag-e1.37.29/build_tag-e1.37.29_64/tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/DependInfo.cmake --color=$(COLOR)
.PHONY : tools/llvm-readobj/CMakeFiles/llvm-readobj.dir/depend

